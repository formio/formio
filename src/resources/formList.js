require("dotenv").config();
const formList = (req, res, router) => {
  let query = { deleted: { $eq: null } };
  let titleQuery = {};
  const skipForm = req.query.skip || 0;
  const limitForm = req.query.limit || 0;
  const sortForm = req.query.sort && req.query.sort === "-title" ? -1 : 1;
  console.log("tenantKey")
  let { type, tags, title__regex } = req.query;
  type = type ? { type } : {};
  tags = tags ? { tags: tags.split(",") } : {};
  query = { ...query, ...tags, ...type };
  console.log("11111111111")
  let regex = title__regex ? title__regex.split("/").filter((i) => i) : "";
  titleQuery = regex
    ? { title: { $regex: `${regex[0]}`, $options: `${regex[1]}` } }
    : {};

  let { MULTI_TENANCY_ENABLED } = process.env;
  let tenantQuery = {};
  if (MULTI_TENANCY_ENABLED === "true" && req.token?.tenantKey) {
      console.log('tis')
    const { tenantKey } = req.token;
    tenantQuery = {tenantKey };
  }
  console.log("555555555555555")
  console.log(query)
  console.log(tenantQuery)
  
  router.formio.resources.form.model
    .find({ ...query, ...titleQuery, ...tenant })
    .skip(skipForm)
    .limit(limitForm)
    .sort({ title: sortForm })
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.status(403).json(err);
    });
};

module.exports = formList;
