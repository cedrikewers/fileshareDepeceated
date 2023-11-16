/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Authentication } from "./authentication";

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	cloudStorage: R2Bucket;
	db : D1Database;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

// const uploadDiv : string = `
// 		<div id="uploadDiv">
//                 <h2>Upload a New File:</h2>
// 				<input type="file"id="file">
// 				<br><br>
// 				<button id="upload" style="margin-right: 15px"> Upload </button>
//         </div>
// `;

// const landigPage : string = `
// <!DOCTYPE html>
// <html>
//     <head>
//         <title>Fileshare</title>
//         <style>
//             body{
//                 background-color: grey;
//             }
//             .container {
//                 width: 50%;
//                 margin: 0 auto;
//                 text-align: center;
//             }
//             .bar {
//                 width: 100%;
//                 height: 30px;
//                 background-color: #ddd;
//                 border-radius: 5px;
//                 margin-bottom: 10px;
//                 position: relative;
//             }
//             .bar-fill {
//                 height: 100%;
//                 background-color: green;
//                 border-radius: 5px;
//                 position: absolute;
//                 top: 0;
//                 left: 0;
//             }
//             .label {
//                 font-size: 20px;
//                 font-weight: bold;
//             }
//         </style>
//     </head>
//     <body>
//         <div class="container">
//             <div class="bar">
//                 <div class="bar-fill" style="width: {{storageusagepercent}}%;"></div>
//             </div>
//             <div class="label">Storage Usage: {{storageusage}} / 5GB</div>
//         </div>
//         <div>
//                 <h2>Available Files for Download:</h2>
//                 <ul>
//                         {{filepaths}}
//                 </ul>
//         </div>
//         {{uploadDiv}}
//     </body>
// 	<script>
//         const partSize = 10 * 1024 * 1024; // 10MB
//         const maxSize = 25 * partSize; // 250MB

// 		async function loadingBar(){
// 			//display loading bar
// 			let dotcount = 1;
// 			const uploadDiv = document.getElementById('uploadDiv');
// 			const loadingDots = document.createElement('span');
// 			uploadDiv.appendChild(loadingDots);
// 			const dots = () => {
// 				loadingDots.innerHTML = "Uploading" + ".".repeat(dotcount);
// 				dotcount = (dotcount + 1) % 4;
// 				setTimeout(dots, 500);
// 			}
// 			dots();
// 		} 

//         const fileInput = document.getElementById('file');
//         const uploadButton = document.getElementById('upload');
//         uploadButton.addEventListener('click', async (event) => {

// 			loadingBar();

//             const [file] = fileInput.files;
//             if(!file) {
//                 console.log("no file selected");
//                 return;
//             }

//             if(file.size > maxSize) {
//                 console.log("file too large");
//                 return;
//             }

//             const key = file.name

//             const response = await fetch('/create/' + key, {method: 'POST'})
// 			const responseJson = await response.json();
//             const uploadId = responseJson.uploadId;

//             const parts = []
//             for(i = 0; i < file.size / partSize; i++){
//                 parts[i] = fetch(
//                     '/upload/' + key + "?uploadId=" + uploadId+ "&part=" + (i + 1), 
//                     {
//                         method: 'PUT', 
//                         body: file.slice(i * partSize, (i + 1) * partSize)
//                     }
//                 );
//             }

//             Promise.all(parts).then(async (responses) => {
//                 const responseJsons = await Promise.all(responses.map((response) => response.json()));
// 				const uploadedParts = responseJsons.map((responseJson) => responseJson.uploadedPart);

//                 await fetch('/complete/' + key + "?uploadId=" + uploadId, {
//                     method: 'POST',
//                     body: JSON.stringify({parts: uploadedParts})
//                 });

// 				location.reload();
//             });

//         });
// 	</script>
// </html>
// `;
/**
 * HTML replacement {{key}} gets replaced with value
 */

// interface ReplaceStrings {
// 	[key: string]: string;
// }
// function replaceStrings(str: string, replaceStrings: ReplaceStrings) : string {
// 	for (const [key, value] of Object.entries(replaceStrings)) {
// 		str = str.replace(`{{${key}}}`, value);
// 	}
// 	return str;
// }

const maxStorageCapacity = 5e8;

interface DownloadableItem {
	name: string;
	size: number;
	downloadUri: string;
}

interface StandardResponse {
	error?: string;
	maxStorageCapacity?: number;
	storageUsage?: number;
	downloadableItems? : DownloadableItem[]
}

/**
 * The functionfor the '/' and '' path
 * @param env 
 * @returns the html response
 */
async function view(env: Env) : Promise<Response> {
	const responseData : StandardResponse = {maxStorageCapacity: maxStorageCapacity, downloadableItems: new Array<DownloadableItem>()};

	const bucketItems = await env.cloudStorage.list({prefix: 'fileshare/'});
	let storageUsage : number = 0;
	
	bucketItems.objects.forEach((item) => {
		storageUsage += item.size;
		const key = item.key.replace('fileshare/', '');
		responseData.downloadableItems?.push({
			name: decodeURIComponent(atob(key)),
			size: item.size,
			downloadUri: `/download/${key}`,
		});
		//return `<li><a href="/download/${atob(key)}">${decodeURIComponent(atob(key))}</a> (${humanFileSize(item.size)})</li>`;
	});

	responseData.storageUsage = storageUsage;


	// rStrings["storageusagepercent"] = (storageUsage / maxStorageCapacity).toFixed(2);
	// rStrings["storageusage"] = `${humanFileSize(storageUsage)}`;
	// rStrings["filepaths"] = items.join('\n');
	// rStrings["uploadDiv"] = uploadDiv;
	return new Response(JSON.stringify(responseData),  { headers: { 'content-type': 'text/json' } });
}

async function download(path: string, env:Env) : Promise<Response> {
	const filename : string = path.replace('/download/', '');
	if(!filename.length){
		return new Response('400 - Bad Request', { status: 400 });
	}

	const key = "fileshare/" + btoa(filename);
	const file = await env.cloudStorage.get(key);
	if(!file){
		return new Response('404 - Not Found', { status: 404 });
	}
	return new Response(file.body, { headers: { 'content-type': 'application/octet-stream' } });
}

async function upload(request: Request, env: Env) : Promise<Response> {
	const bucketItems = await env.cloudStorage.list();
	let storageUsage : number = 0;
	const items = bucketItems.objects.forEach((item) => {
		storageUsage += item.size;
	});
	if(storageUsage + parseInt(request.headers.get('content-length') || "0") > maxStorageCapacity){
		return new Response(JSON.stringify({error: "Storage limit reached"}), { status: 400 });
	}

	const url = new URL(request.url);
	const path = url.pathname.split('/');
	const key = "fileshare/" + btoa(path[2]);
	switch(path[1]){
		case 'create': {
			const mpUpload = await env.cloudStorage.createMultipartUpload(key);
			return new Response(JSON.stringify({
				key: mpUpload.key,
				uploadId: mpUpload.uploadId,
			}));
		}

		case 'upload': {
			try{
				const uploadId = url.searchParams.get('uploadId') || '';
				const partNo = parseInt(url.searchParams.get('part') || '0');

				const mpUpload = env.cloudStorage.resumeMultipartUpload(key, uploadId);
		
				const uploadedPart: R2UploadedPart = await mpUpload.uploadPart(partNo, await request.arrayBuffer());
				return new Response(JSON.stringify({uploadedPart}));
			}
			catch(e : any){
				return new Response(JSON.stringify({error: e.message}), { status: 500 });
			}
		}

 		case 'complete': {
			try{
				const uploadId = url.searchParams.get('uploadId') || '';

				const mpUpload = env.cloudStorage.resumeMultipartUpload(key, uploadId);

				interface completeBody {
					parts: R2UploadedPart[];
				}
		
				const completeBody: completeBody = await request.json();
				console.log(JSON.stringify(completeBody));
				const object = await mpUpload.complete(completeBody.parts);
				return new Response(null, {
					headers: {
						etag: object.httpEtag,
					},
				});
			}
			catch(e : any){
				return new Response(JSON.stringify({error: e.message}), { status: 500 });
			}
		}

	}

	return new Response(JSON.stringify({error: "Method not supported"}), { status: 400 });
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if(path === '' || path === '/'){
			return new Response(null, { status: 204 })
		}
		else if (path.startsWith("/view")){
			return await view(env);
		}
		else if(path.startsWith('/download')){
			return await download(path, env);
		}
		else if(request.method === 'POST' || request.method === 'PUT'){
			return await upload(request, env);
		}
		else{
			return new Response('404 - Not Found', { status: 404 });
		}

	}
}

