import fs from 'fs';
import { logger } from './Logger';

const STATUS_REPORT_FILE = 'download-report.csv'

export const enum VIDEO_STATUS {
    ALREADY_DOWNLOADED = "ALREADY_DOWNLOADED",
    DOWNLOAD_SUCCESSFUL = "DOWNLOAD_SUCCESSFUL",
    NOT_FOUND = "NOT_FOUND",
    FORBIDDEN = "FORBIDDEN",
    UNKNOWN_METADATA_ERROR = "UNKNOWN_METADATA_ERROR",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

// function convertToCSV(data: any[], status: VIDEO_STATUS): string {
//     const csvRows = data.map((row) =>
//         Object.values(row).map((value) => JSON.stringify(value)).join(',')
//     );
//     return csvRows.join('\n');
// }

export function reportVideoStatus(videoGuid: string, status: VIDEO_STATUS) {
    const videoStatus = {
        "guid": videoGuid,
        "status": status.toString()
    }

    const csvRow = Object.values(videoStatus).map((value) => JSON.stringify(value)).join(',') + '\n';

    try {
        fs.appendFileSync(STATUS_REPORT_FILE, csvRow);
        logger.verbose(`Appended to csv report: ${csvRow}`)
    } catch (error) {
        logger.error(`Error writing to report: ${error}`)
    }
}