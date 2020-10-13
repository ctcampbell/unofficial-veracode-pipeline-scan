#!/usr/bin/env node

import { Scan, ScansApi, ScanUpdateScanStatusEnum, ScanResourceScanStatusEnum, SegmentsApi, FindingsApi, Issue, ScanFindingsResource } from './api';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as url from 'url';

const scansApi = new ScansApi();
const segmentsApi = new SegmentsApi();
const findingsApi = new FindingsApi();
let runningScanId = '';
let resultsFileName = 'veracode-pipeline-results.json';

if (process.argv.length == 3) {
    try {
        let fileUrl = url.pathToFileURL(process.argv[2]);
        runPipelineScan(fileUrl);
    } catch(error){
		console.log('Usage: unofficial-veracode-pipeline-scan <file-to-scan>');
        console.log(error.message);
    }
}

async function runPipelineScan(target: URL) {
    let fileUrlString = target.toString();
    let fileName = fileUrlString.substring(fileUrlString.lastIndexOf('/') + 1);
    sendLogMessage(`Scanning ${fileName}`);

    let file = fs.readFileSync(target);

    try {
        let scansPostResponse = await createScan(file, fileName);
        if (scansPostResponse.data.scan_id && scansPostResponse.data.binary_segments_expected) {
            runningScanId = scansPostResponse.data.scan_id;
            sendLogMessage(`Scan ID ${runningScanId}`);
            await uploadFile(runningScanId, file, scansPostResponse.data.binary_segments_expected);
            try {
                let scansScanIdPutResponse = await scansApi.scansScanIdPut(runningScanId, {
                    scan_status: ScanUpdateScanStatusEnum.STARTED
                });
                sendLogMessage(`Scan status ${scansScanIdPutResponse.data.scan_status}`);
            } catch(error) {
                sendLogMessage(error.message);
            }
            await pollScanStatus(runningScanId);
            let scansScanIdFindingsGetResponse = await findingsApi.scansScanIdFindingsGet(runningScanId);
            if (scansScanIdFindingsGetResponse.data.findings) {
                sendLogMessage(`Number of findings is ${scansScanIdFindingsGetResponse.data.findings.length}`);
                processScanFindingsResource(scansScanIdFindingsGetResponse.data);
            }
        }
    } catch(error) {
        sendLogMessage(error.message);
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

async function cancelScan() {
    sendLogMessage(`Cancelling scan ${runningScanId}`);
	try {
        let scansScanIdPutResponse = await scansApi.scansScanIdPut(runningScanId, {
            scan_status: ScanUpdateScanStatusEnum.CANCELLED
        });
        sendLogMessage(`Scan status ${scansScanIdPutResponse.data.scan_status}`);
    } catch(error) {
        sendLogMessage(error.message);
    }
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
			sendLogMessage(`Uploaded segment of size ${scansScanIdSegmentsSegmentIdPutResponse.data.segment_size} bytes`);
		} catch(error) {
			sendLogMessage(error.message);
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
		sendLogMessage(`Scan status ${scansScanIdGetResponse.data.scan_status}`);
	}
}

function processScanFindingsResource(scanFindingsResource: ScanFindingsResource) {
    sendLogMessage(`Saving results to ${resultsFileName}`);
    let data = JSON.stringify(scanFindingsResource, null, 4);
    fs.writeFileSync(resultsFileName, data);
}

// Utils functions

function sleep(ms: number) {
	return new Promise((resolve) => {
	  	setTimeout(resolve, ms);
	});
}

function mapSeverityToString(sev: number): string | undefined {
	switch (sev) {
		case 5: return 'Very High';
		case 4: return 'High';
		case 3: return 'Medium';
		case 2: return 'Low';
		case 1: return 'Very Low';
		case 0: return 'Informational';
	}
}

function makeTimestamp(): string {
	let now = new Date();
	return `[${now.toISOString()}]`;
}

function sendLogMessage(message: string) {
	console.log(`${makeTimestamp()} ${message}`);
}

process.on('SIGTERM', () => {
    cancelScan();
})
