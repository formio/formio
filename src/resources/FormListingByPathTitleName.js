
module.exports = {
  getFormsByTitleOrPathOrName: (router) =>
    async function (req, res, next) {
      try {
        if(!req.isAdmin){
          res.status(401).json({message:"unauthorized"})
        }
        const { title, path, name, select } = req.query;
        const condition = [];

        if (title) condition.push({ title });
        if (path) condition.push({ path });
        if (name) condition.push({ name });

        if (condition.length === 0) {
          return res.status(400).json({ message: "No query parameters provided." });
        }
 
        let projection = {};
        if (select) {
          projection = select.split(",").reduce((acc, field) => {
            acc[field] = 1; 
            return acc;
          }, {});
        } 
        const forms = await router.formio.resources.form.model.find({ $or: condition , deleted:{$eq: null}},projection);
        return res.json(forms);
      } catch (error) {
        next(error);
      }
    },
};
