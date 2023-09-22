import colors, { Color } from 'colors';
import winston from 'winston';


export const logger: winston.Logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.errors({ stack: true }),
                winston.format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss' }),
                winston.format.printf(
                    (item: winston.Logform.TransformableInfo) => customPrint(item)
                )
            )
        })
    ]
});


function customPrint(info: winston.Logform.TransformableInfo): string {
    let color: Color

    if (info.level === 'fatal') {
        color = colors.bgRed
    }
    else if (info.level === 'error') {
        color = colors.red
    }
    else if (info.level === 'warn') {
        color = colors.yellow
    }
    else if (info.level === 'verbose') {
        color = colors.cyan
    }
    else {
        color = colors.white
    }

    return color(`[${info.level.toUpperCase()}] : ${info.timestamp} - ${info.message}`);
}
