interface Env {
    cloudStorage: R2Bucket;
	db : D1Database;
}

const maxStorageCapacity = 5e9;

export const onRequestPost:  PagesFunction<Env> = async (ctx) => {
    const bucketItems = await ctx.env.cloudStorage.list();
	const storageUsage = bucketItems.objects.reduce((acc, item) => acc + item.size, 0);

	if(storageUsage + parseInt(ctx.request.headers.get('content-length') || "0") > maxStorageCapacity){
		return new Response(JSON.stringify({error: "Storage limit reached"}), { status: 503 });
	}

    const key = btoa(ctx.params.key as string);
    try{
        const mpUpload = await ctx.env.cloudStorage.createMultipartUpload(key);
        return new Response(JSON.stringify({
            key: mpUpload.key,
            uploadId: mpUpload.uploadId,
        }));
    }
    catch(e : any){
        return new Response(JSON.stringify({error: e.message}), { status: 500 });
    }
		
}