interface Env {
    cloudStorage: R2Bucket;
	db : D1Database;
}

export const onRequestPut:  PagesFunction<Env> = async (ctx) => {

    const url = new URL(ctx.request.url);
    const key = ctx.params.key as string;

    try{
        const uploadId = url.searchParams.get('uploadId') || '';
        const partNo = parseInt(url.searchParams.get('part') || '0');

        const mpUpload = ctx.env.cloudStorage.resumeMultipartUpload(key, uploadId);

        const uploadedPart: R2UploadedPart = await mpUpload.uploadPart(partNo, await ctx.request.arrayBuffer());
        return new Response(JSON.stringify({uploadedPart}));
    }
    catch(e : any){
        return new Response(JSON.stringify({error: e.message}), { status: 500 });
    }
}