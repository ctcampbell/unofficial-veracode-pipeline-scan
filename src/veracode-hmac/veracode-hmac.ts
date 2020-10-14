import * as util from 'util';
import * as crypto from 'crypto';

function getAuthorizationScheme() { return "VERACODE-HMAC-SHA-256"; }
function getRequestVersion() { return "vcode_request_version_1"; }
function getNonceSize() { return 16; }

function computeHashHex(message: string, key_hex: string) {
    let key = Buffer.from(key_hex, 'hex');
    return crypto.createHmac('sha256', key).update(message).digest('hex');
}

function calulateDataSignature(apiKeyBytes: string, nonceBytes: string, dateStamp: string, data: string) {
    var kNonce = computeHashHex(nonceBytes, apiKeyBytes);
    var kDate = computeHashHex(dateStamp, kNonce);
    var kSig = computeHashHex(getRequestVersion(), kDate);
    var kFinal = computeHashHex(data, kSig);
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
    var data = util.format("id=%s&host=%s&url=%s&method=%s", id, hostName, uriString, httpMethod);
    var dateStamp = Date.now().toString();
    var nonceBytes = newNonce(getNonceSize());
    var dataSignature = calulateDataSignature(key, nonceBytes, dateStamp, data);
    var authorizationParam = util.format("id=%s,ts=%s,nonce=%s,sig=%s", id, dateStamp, toHexBinary(nonceBytes), dataSignature.toUpperCase());
    var header = getAuthorizationScheme() + " " + authorizationParam;
    return header;
}