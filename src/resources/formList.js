require("dotenv").config();
const formList = (req, res, router) => {
  const range= req.get('range')
  let query = { deleted: { $eq: null } };
  let titleQuery = {};
  const skipForm = req.query.skip ||range&&range.split("-")[0] || 0;
  const limitForm = req.query.limit || range&&Number(range.split("-")[1])+1||  0;
  const sortForm = req.query.sort && req.query.sort === "-title" ? -1 : 1;
  let { type, tags, title__regex } = req.query;
  type = type ? { type } : {};
  tags = tags ? { tags: tags.split(",") } : {};
  query = { ...query, ...tags, ...type };
  let regex = title__regex ? title__regex.split("/").filter((i) => i) : "";
  titleQuery = regex
    ? { title: { $regex: `${regex[0]}`, $options: `${regex[1]}` } }
    : {};

  let { MULTI_TENANCY_ENABLED } = process.env;
  let tenantQuery = {};
  
  if (MULTI_TENANCY_ENABLED === "true" ) {
    if(req.token?.tenantKey){
      const { tenantKey } = req.token;
      tenantQuery = {tenantKey };
    }else{
      res.json([])
      return true
    }
   
  }
  
  const allForms = new Promise((resolve,reject)=>{
    router.formio.resources.form.model
    .find({ ...query, ...titleQuery,...tenantQuery})
    .skip(skipForm)
    .limit(limitForm)
    .sort({ title: sortForm })
    .lean().then((result)=>resolve(result)).catch(err=>reject(err))
  })
  const formCount = new Promise((resolve,reject)=>{
    router.formio.resources.form.model
    .find({ ...query, ...titleQuery,...tenantQuery})
    .count().then((result)=>resolve(result)).catch(err=>reject(err))
  })

  Promise.all([allForms,formCount]).then((result)=>{
    const rangeOf = range?range:`${skipForm}-${(Number(limitForm)+Number(skipForm)-1)}`
    const newRange=  `${rangeOf}/${result[1]}`
    res.setHeader('Accept-Ranges','items')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Range-Unit')
    res.setHeader('content-range',newRange)
    res.json(result[0])
  }).catch((err)=>{
    console.log(err)
    res.status(403).json(err)
  })

  
     
};

module.exports = formList;
