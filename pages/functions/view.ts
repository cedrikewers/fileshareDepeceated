interface Env {
    cloudStorage: R2Bucket;
	db : D1Database;
}

const maxStorageCapacity = 5e9;

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

export const onRequestGet : PagesFunction<Env> = async (ctx) => {
	const responseData : StandardResponse = {maxStorageCapacity: maxStorageCapacity, downloadableItems: new Array<DownloadableItem>()};

	const bucketItems = await ctx.env.cloudStorage.list({prefix: 'fileshare/'});
	let storageUsage : number = 0;
	
	bucketItems.objects.forEach((item) => {
		storageUsage += item.size;
		const key = item.key.replace('fileshare/', '');
		responseData.downloadableItems?.push({
			name: decodeURIComponent(atob(key)),
			size: item.size,
			downloadUri: `/download/${atob(key)}`,
		});
	});

	responseData.storageUsage = storageUsage;
	return new Response(JSON.stringify(responseData),  { headers: { 'content-type': 'text/json' } });
}