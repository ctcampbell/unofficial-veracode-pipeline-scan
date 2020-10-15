#!/usr/bin/env node

import { Scan, ScansApi, ScanUpdateScanStatusEnum, ScanResourceScanStatusEnum, SegmentsApi, FindingsApi, ScanFindingsResource } from './api';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as url from 'url';
import * as path from 'path';

const usage = 'Usage: unofficial-veracode-pipeline-scan <file-to-scan> [<output-file>]';
const defaultOutputFileName = 'unofficial-veracode-pipeline-scan-results.json';

const scansApi = new ScansApi();
const segmentsApi = new SegmentsApi();
const findingsApi = new FindingsApi();

let runningScanId = '';
let messageFunction = sendLogMessage;

if (require.main === module) {
	process.on('SIGINT', async () => {
		await cancelScan();
		process.exit();
	});
	
	if (process.argv.length === 3 || process.argv.length === 4) {
		try {
			let fileUrl = url.pathToFileURL(process.argv[2]);
			let outputFileUrl = url.pathToFileURL(process.argv[3] || defaultOutputFileName);
			runPipelineScan(fileUrl, outputFileUrl);
		} catch(error){
			console.log(usage);
			console.log(error.message);
		}
	} else {
		console.log(usage);
	}
}

export async function runPipelineScan(target: URL, outputFile: URL, messageCallback?: (message: string) => void) {
	if (messageCallback) {
		messageFunction = messageCallback;
	}
    let fileUrlString = target.toString();
    let fileName = fileUrlString.substring(fileUrlString.lastIndexOf(path.sep) + 1);
	messageFunction(`Scanning ${fileName}`);

    let file = fs.readFileSync(target);

    try {
        let scansPostResponse = await createScan(file, fileName);
        if (scansPostResponse.data.scan_id && scansPostResponse.data.binary_segments_expected) {
            runningScanId = scansPostResponse.data.scan_id;
            messageFunction(`Scan ID ${runningScanId}`);
            await uploadFile(runningScanId, file, scansPostResponse.data.binary_segments_expected);
            try {
                let scansScanIdPutResponse = await scansApi.scansScanIdPut(runningScanId, {
                    scan_status: ScanUpdateScanStatusEnum.STARTED
                });
                messageFunction(`Scan status ${scansScanIdPutResponse.data.scan_status}`);
            } catch(error) {
                messageFunction(error.message);
            }
            await pollScanStatus(runningScanId);
            let scansScanIdFindingsGetResponse = await findingsApi.scansScanIdFindingsGet(runningScanId);
            if (scansScanIdFindingsGetResponse.data.findings) {
                messageFunction(`Number of findings is ${scansScanIdFindingsGetResponse.data.findings.length}`);
                processScanFindingsResource(scansScanIdFindingsGetResponse.data, outputFile);
            }
        }
    } catch(error) {
        messageFunction(error.message);
    }
}

export async function cancelScan(scanId?: string) {
	let scanToCancel = scanId || runningScanId;
    messageFunction(`Cancelling scan ${scanToCancel}`);
	try {
        let scansScanIdPutResponse = await scansApi.scansScanIdPut(scanToCancel, {
            scan_status: ScanUpdateScanStatusEnum.CANCELLED
        });
        messageFunction(`Scan status ${scansScanIdPutResponse.data.scan_status}`);
    } catch(error) {
        messageFunction(error.message);
    }
}

function createScan(file: Buffer, fileName: string) {
	let scan: Scan = {
		binary_hash: crypto.createHash('sha256').update(file).digest('hex'),
		binary_name: fileName,
		binary_size: file.byteLength
	};
	return scansApi.scansPost(scan);
}

async function uploadFile(scanId: string, file: Buffer, segmentCount: number) {
	for (let i = 0; i < segmentCount; i++) {
		let segmentBegin = i * (file.byteLength/segmentCount);
		let segmentEnd = 0;
		if (i === segmentCount - 1) {
			segmentEnd = file.byteLength;
		} else {
			segmentEnd = segmentBegin + file.byteLength/segmentCount;
		}
		let fileSegment = file.slice(segmentBegin, segmentEnd);
		try {
			let scansScanIdSegmentsSegmentIdPutResponse = await segmentsApi.scansScanIdSegmentsSegmentIdPut(scanId, i, fileSegment);
			messageFunction(`Uploaded segment of size ${scansScanIdSegmentsSegmentIdPutResponse.data.segment_size} bytes`);
		} catch(error) {
			messageFunction(error.message);
		}
	}
}

async function pollScanStatus(scanId: string) {
	let scanComplete = false;
	while (!scanComplete) {
		await sleep(3000);
		let scansScanIdGetResponse = await scansApi.scansScanIdGet(scanId);
		switch(scansScanIdGetResponse.data.scan_status) {
			case ScanResourceScanStatusEnum.PENDING:
			case ScanResourceScanStatusEnum.STARTED:
			case ScanResourceScanStatusEnum.UPLOADING: {
				break;
			}
			default: {
				scanComplete = true;
			}
		}
		messageFunction(`Scan status ${scansScanIdGetResponse.data.scan_status}`);
	}
}

function processScanFindingsResource(scanFindingsResource: ScanFindingsResource, outputFile: URL) {
    messageFunction(`Saving results to ${outputFile.toString()}`);
    let data = JSON.stringify(scanFindingsResource, null, 4);
    fs.writeFileSync(outputFile, data);
}

// Utils functions

function sleep(ms: number) {
	return new Promise((resolve) => {
	  	setTimeout(resolve, ms);
	});
}

function makeTimestamp(): string {
	let now = new Date();
	return `[${now.toISOString()}]`;
}

function sendLogMessage(message: string) {
	console.log(`${makeTimestamp()} ${message}`);
}
