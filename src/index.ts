/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	cloudStorage: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

const landigPage : string = `
<!DOCTYPE html>
<html>
    <head>
        <title>Storage Usage</title>
        <style>
            .container {
                width: 50%;
                margin: 0 auto;
                text-align: center;
            }
            .bar {
                width: 100%;
                height: 30px;
                background-color: #ddd;
                border-radius: 5px;
                margin-bottom: 10px;
                position: relative;
            }
            .bar-fill {
                height: 100%;
                background-color: green;
                border-radius: 5px;
                position: absolute;
                top: 0;
                left: 0;
            }
            .label {
                font-size: 20px;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="bar">
                <div class="bar-fill" style="width: {{storageusagepercent}}%;"></div>
            </div>
            <div class="label">Storage Usage: {{storageusage}} / 10GB</div>
        </div>
        <div>
                <h2>Available Files for Download:</h2>
                <ul>
                        {{filepaths}}
                </ul>
        </div>
        <div>
                <h2>Upload a New File:</h2>
                <form action="/upload" method="post" enctype="multipart/form-data">
                        <input type="file" name="file">
                        <br><br>
                        <input type="submit" value="Upload">
                </form>
        </div>
    </body>
</html>
    
  </body>
</html>
`;
/**
 * HTML replacement {{key}} gets replaced with value
 */

interface replaceStrings {
	[key: string]: string;
}
function replaceStrings(str: string, replaceStrings: replaceStrings) : string {
	for (const [key, value] of Object.entries(replaceStrings)) {
		str = str.replace(`{{${key}}}`, value);
	}
	return str;
}


/**
 * Human readable file size
 */
function humanFileSize(bytes: number) : string {
	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	let unitCounter = 0;
	const thresh = 1024;
	while(bytes >= thresh){
		bytes /= thresh;
		unitCounter++;
	}
	return `${bytes.toFixed(2)} ${units[unitCounter]}`;
}

/**
 * The functionfor the '/' and '' path
 * @param env 
 * @returns the html response
 */
async function home(env: Env) : Promise<Response> {
	let rStrings : replaceStrings = {};

	const bucketItems = await env.cloudStorage.list();
	let storageUsage : number = 0;
	
	const items = bucketItems.objects.map((item) => {
		storageUsage += item.size;
		return `<li><a href="/download/${encodeURIComponent(item.key)}">${item.key}</a> (${humanFileSize(item.size)})</li>`;
	});

	rStrings["storageusagepercent"] = (storageUsage / 1e9).toFixed(2);
	rStrings["storageusage"] = `${humanFileSize(storageUsage)}`;
	rStrings["filepaths"] = items.join('\n');

	let html : string = landigPage.slice();

	return new Response(replaceStrings(html, rStrings),  { headers: { 'content-type': 'text/html' } });
}

async function download(path: string, env:Env) : Promise<Response> {
	const filename : string = path.replace('/download/', '');
	if(!filename){
		return new Response('400 - Bad Request', { status: 400 });
	}

	const file = await env.cloudStorage.get(decodeURIComponent(filename));
	if(!file){
		return new Response('404 - Not Found', { status: 404 });
	}
	return new Response(file.body, { headers: { 'content-type': 'application/octet-stream' } });
}

class RemoveAndReadContentDispositionTranformStream implements Transformer<Uint8Array, Uint8Array> {
	private contentDisposition: string | null = null;

	async transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>): Promise<void> {
		const text = new TextDecoder().decode(chunk);
		const match = text.match(/Content-Disposition:.*filename="(.*)"/);
	}
}



export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		if(path === '' || path === '/'){
			return await home(env);
		}
		else if(path.startsWith('/download')){
			return await download(path, env);
		}
		else if(request.method === 'POST' && path === '/upload'){
			

			return new Response((await request.body?.getReader().read())?.value, { headers: { 'content-type': 'application/json' } });
		}
		else{
				return new Response('404 - Not Found', { status: 404 });
		}

	}
}

