import { ApiClient } from './ApiClient';
import { promptUser } from './CommandLineParser';
import { logger } from './Logger';
import { Video, Session } from './Types';

import { AxiosResponse } from 'axios';
import fs from 'fs';
import { parse as parseDuration, Duration } from 'iso8601-duration';
import path from 'path';
import sanitizeWindowsName from 'sanitize-filename';
import { cacheVideoMetadata, getCachedVideoMetadata } from './MetadataCache';
import { VIDEO_STATUS, reportVideoStatus } from './VideoReport';

function publishedDateToString(date: string): string {
    const dateJs: Date = new Date(date);
    const day: string = dateJs.getDate().toString().padStart(2, '0');
    const month: string = (dateJs.getMonth() + 1).toString(10).padStart(2, '0');

    return `${dateJs.getFullYear()}-${month}-${day}`;
}


function publishedTimeToString(date: string): string {
    const dateJs: Date = new Date(date);
    const hours: string = dateJs.getHours().toString();
    const minutes: string = dateJs.getMinutes().toString();
    const seconds: string = dateJs.getSeconds().toString();

    return `${hours}.${minutes}.${seconds}`;
}


function isoDurationToString(time: string): string {
    const duration: Duration = parseDuration(time);

    return `${duration.hours ?? '00'}.${duration.minutes ?? '00'}.${duration.seconds?.toFixed(0) ?? '00'}`;
}


function durationToTotalChunks(duration: string): number {
    const durationObj: any = parseDuration(duration);
    const hrs: number = durationObj.hours ?? 0;
    const mins: number = durationObj.minutes ?? 0;
    const secs: number = Math.ceil(durationObj.seconds ?? 0);

    return (hrs * 60) + mins + (secs / 60);
}


export async function getVideoInfo(videoGuids: Array<string>, session: Session, subtitles?: boolean): Promise<Array<Video>> {
    const metadata: Array<Video> = [];
    let title: string;
    let duration: string;
    let publishDate: string;
    let publishTime: string;
    let author: string;
    let authorEmail: string;
    let uniqueId: string;
    const outPath = '';
    let totalChunks: number;
    let playbackUrl: string;
    let posterImageUrl: string;
    let captionsUrl: string | undefined;

    const apiClient: ApiClient = ApiClient.getInstance(session);

    logger.verbose('Fetching video metadata')

    /* TODO: change this to a single guid at a time to ease our footprint on the
    MSS servers or we get throttled after 10 sequential reqs */
    for (const guid of videoGuids) {
        let currentVideo: Video | undefined = undefined;

        logger.verbose(`Try to get metadata for video ${guid}`)

        currentVideo = getCachedVideoMetadata(guid);

        if (currentVideo === undefined) {
            let response: AxiosResponse<any> | undefined

            try {
                response = await apiClient.callApi('videos/' + guid + '?$expand=creator', 'get');
            } catch (err) {

                switch (err.response.status) {
                    case 403:
                        reportVideoStatus(guid, VIDEO_STATUS.FORBIDDEN)
                        break;
                    case 404:
                        reportVideoStatus(guid, VIDEO_STATUS.NOT_FOUND)
                        break;
                    default:
                        reportVideoStatus(guid, VIDEO_STATUS.UNKNOWN_METADATA_ERROR)
                        break;
                }

                logger.error(`Error getting metadata for video ${guid}; Response returned ${err.response.status}: ${err.response.statusText}`)
                continue;
            }

            currentVideo = await convertResponseToVideo(response, guid);
            logger.verbose(`Successfully retrieved metadata for video ${guid}`)

            cacheVideoMetadata(currentVideo);
        }

        metadata.push(currentVideo);
    }

    return metadata;

    async function convertResponseToVideo(response: AxiosResponse<any> | undefined, guid: string): Promise<Video> {
        title = sanitizeWindowsName(response?.data['name']);

        duration = isoDurationToString(response?.data.media['duration']);

        publishDate = publishedDateToString(response?.data['publishedDate']);

        publishTime = publishedTimeToString(response?.data['publishedDate']);

        author = response?.data['creator'].name;

        authorEmail = response?.data['creator'].mail;

        uniqueId = guid;

        totalChunks = durationToTotalChunks(response?.data.media['duration']);

        playbackUrl = response?.data['playbackUrls']
            .filter((item: { [x: string]: string; }) => item['mimeType'] == 'application/vnd.apple.mpegurl')
            .map((item: { [x: string]: string; }) => {
                return item['playbackUrl'];
            })[0];

        posterImageUrl = response?.data['posterImage']['medium']['url'];

        if (subtitles) {
            const captions: AxiosResponse<any> | undefined = await apiClient.callApi(`videos/${guid}/texttracks`, 'get');

            if (!captions?.data.value.length) {
                captionsUrl = undefined;
            }
            else if (captions?.data.value.length === 1) {
                logger.info(`Found subtitles for ${title}. \n`);
                captionsUrl = captions?.data.value.pop().url;
            }
            else {
                const index: number = promptUser(captions.data.value.map((item: { language: string; autoGenerated: string; }) => {
                    return `[${item.language}] autogenerated: ${item.autoGenerated}`;
                }));
                captionsUrl = captions.data.value[index].url;
            }
        }

        return {
            title: title,
            duration: duration,
            publishDate: publishDate,
            publishTime: publishTime,
            author: author,
            authorEmail: authorEmail,
            uniqueId: uniqueId,
            outPath: outPath,
            totalChunks: totalChunks,    // Abstraction of FFmpeg timemark
            playbackUrl: playbackUrl,
            posterImageUrl: posterImageUrl,
            captionsUrl: captionsUrl
        }
    }
}


export function createUniquePath(videos: Array<Video>, outDirs: Array<string>, template: string, format: string, skip?: boolean): Array<Video> {

    videos.forEach((video: Video, index: number) => {
        let title: string = template;
        let finalTitle: string;
        const elementRegEx = RegExp(/{(.*?)}/g);
        let match = elementRegEx.exec(template);

        while (match) {
            const value = video[match[1] as keyof Video] as string;
            title = title.replace(match[0], value);
            match = elementRegEx.exec(template);
        }

        let i = 0;
        finalTitle = title;

        while (!skip && fs.existsSync(path.join(outDirs[index], finalTitle + '.' + format))) {
            finalTitle = `${title}.${++i}`;
        }

        const finalFileName = `${finalTitle}.${format}`;
        const cleanFileName = sanitizeWindowsName(finalFileName, { replacement: '_' });
        if (finalFileName !== cleanFileName) {
            logger.warn(`Not a valid Windows file name: "${finalFileName}".\nReplacing invalid characters with underscores to preserve cross-platform consistency.`);
        }

        video.outPath = path.join(outDirs[index], finalFileName);

    });

    return videos;
}
