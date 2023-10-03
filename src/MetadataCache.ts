import fs from 'fs';
import { Video } from './Types';
import { logger } from './Logger';

const METADATA_CACHE_FILE = 'videoMetadata.json';

function readMetadataCache(): Array<Video> {
    let existingData: Array<Video> = [];

    try {
        const fileContent = fs.readFileSync(METADATA_CACHE_FILE, 'utf-8');
        existingData = JSON.parse(fileContent);
    } catch (error) {
        logger.warn(`Didn't retrieve metadata from file: ${error.message}`)
    }

    return existingData;
}

export function getCachedVideoMetadata(videoGuid: string): Video | undefined {
    const metadataCache = readMetadataCache()

    const video = metadataCache.find(video => video.uniqueId === videoGuid)

    return video;
}

export function cacheVideoMetadata(video: Video) {
    let metadataCache = readMetadataCache();
    metadataCache.push(video);

    const serializedMetadata = JSON.stringify(metadataCache, null, 2);

    fs.writeFileSync(METADATA_CACHE_FILE, serializedMetadata);

    logger.verbose(`Cached metadata for video ${video.uniqueId}`)
}