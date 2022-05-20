
const formList =(req,res,router)=>{
    const decodedToken = req.token
    const common = {delete:{$eq:null},type:'form'}
    const query= decodedToken.tag? {"tags":decodedToken.tag,...common}:{...common}
    router.formio.resources.form.model.find(query).then(result=>{
        res.json(result)
    })
}

module.exports= formList