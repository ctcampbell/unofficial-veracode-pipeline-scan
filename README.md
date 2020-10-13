Install using `npm`:

    npm install unofficial-veracode-pipeline-scan

Set up your Veracode API credentials as per https://help.veracode.com/go/c_configure_api_cred_file, or use environment variables:

    export VERACODE_API_KEY_ID=ijf3849r093uie....
    export VERACODE_API_KEY_SECRET=iowur9wjiewofhes......

Then run `unofficial-veracode-pipeline-scan <file-to-scan>`:

    unofficial-veracode-pipeline-scan target/verademo.war 
    [2020-10-13T21:33:51.776Z] Scanning verademo.war
    [2020-10-13T21:33:53.366Z] Scan ID 471ee7c1-6dc6-4d0f-a50b-614d48bc4a0d
    [2020-10-13T21:33:57.050Z] Uploaded segment of size 2310470 bytes
    [2020-10-13T21:34:01.848Z] Uploaded segment of size 2310470 bytes
    [2020-10-13T21:34:05.307Z] Uploaded segment of size 2310470 bytes
    [2020-10-13T21:34:08.721Z] Uploaded segment of size 2310470 bytes
    [2020-10-13T21:34:12.613Z] Uploaded segment of size 2310470 bytes
    [2020-10-13T21:34:16.022Z] Uploaded segment of size 2310470 bytes
    [2020-10-13T21:34:17.251Z] Scan status PENDING
    [2020-10-13T21:34:20.619Z] Scan status STARTED
    [2020-10-13T21:34:24.013Z] Scan status STARTED
    [2020-10-13T21:34:27.400Z] Scan status STARTED
    [2020-10-13T21:34:30.779Z] Scan status STARTED
    [2020-10-13T21:34:34.138Z] Scan status STARTED
    [2020-10-13T21:34:37.521Z] Scan status STARTED
    [2020-10-13T21:34:40.899Z] Scan status STARTED
    [2020-10-13T21:34:44.279Z] Scan status STARTED
    [2020-10-13T21:34:47.640Z] Scan status STARTED
    [2020-10-13T21:34:51.027Z] Scan status STARTED
    [2020-10-13T21:34:54.400Z] Scan status SUCCESS
    [2020-10-13T21:34:55.347Z] Number of findings is 139
    [2020-10-13T21:34:55.347Z] Saving results to veracode-pipeline-results.json