
const formList =(req,res,router)=>{
    let query={delete:{$eq:null}};
    let titleQuery={}
    const skipForm=req.query.skip||0;
    const limitForm=req.query.limit||0;
    const sortForm = req.query.sort&&req.query.sort==='-title'?-1:1
    if(req.query){
        const {type,tags,title__regex}= req.query
        query={...query,type,tags:tags.split(","),}
        let regex = title__regex?title__regex.split("/").filter(i=>i):''
        titleQuery =regex?{title:{$regex:`${regex[0]}`,$options:`${regex[1]}`}}:{}
    }
    let {MULTI_TENANCY_ENABLED} = process.env
    let tenantQuery={}
    if(MULTI_TENANCY_ENABLED&&req.token.tenantId){
        const {tenantId} = req.token
        tenantQuery={tenantId:tenantId}
    }
    router.formio.resources.form.model.find({...query,...titleQuery,...tenant}).skip(skipForm).limit(limitForm).sort({title:sortForm}).then(result=>{
        res.json(result)
    }).catch(err=>{
        res.status(403).json(err)
    })
}

module.exports= formList