import * as crypto from 'crypto';

const authorizationScheme = "VERACODE-HMAC-SHA-256";
const requestVersion = "vcode_request_version_1";
const nonceSize = 16;

function computeHashHex(message: string, key_hex: string) {
    let key = Buffer.from(key_hex, 'hex');
    return crypto.createHmac('sha256', key).update(message).digest('hex');
}

function calulateDataSignature(apiKeyBytes: string, nonceBytes: string, dateStamp: string, data: string) {
    let kNonce = computeHashHex(nonceBytes, apiKeyBytes);
    let kDate = computeHashHex(dateStamp, kNonce);
    let kSig = computeHashHex(requestVersion, kDate);
    let kFinal = computeHashHex(data, kSig);
    return kFinal;
}

function newNonce(size: number) {
    return crypto.randomBytes(size).toString('hex').toUpperCase();
}

function toHexBinary(input: string) {
    return Buffer.from(input).toString('hex');
}

export function calculateAuthorizationHeader(id: string, key: string, hostName: string, uriString: string, urlQueryParams: string, httpMethod: string) {
    uriString += urlQueryParams;
    let data = `id=${id}&host=${hostName}&url=${uriString}&method=${httpMethod}`;
    let dateStamp = Date.now().toString();
    let nonceBytes = newNonce(nonceSize);
    let dataSignature = calulateDataSignature(key, nonceBytes, dateStamp, data);
    let authorizationParam = `id=${id},ts=${dateStamp},nonce=${toHexBinary(nonceBytes)},sig=${dataSignature.toUpperCase()}`;
    let header = authorizationScheme + " " + authorizationParam;
    return header;
}
