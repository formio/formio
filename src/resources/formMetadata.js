const Utils = require("../util/util");
const _ = require("lodash");
module.exports = {
  getFormMetadata: (router) =>
    async function (req, res, next) {
      try {
        const { formIds, isBundle } = req.query;
        const isTheFormIdIsBundle = isBundle == "true";
        const ids =
          formIds && isTheFormIdIsBundle ? formIds.split(",") : [req.params.formId];

        if (isTheFormIdIsBundle) {
          const bundleData = await router.formio.resources.form.model.findOne({
            _id: req.params.formId,
          });
          if (!bundleData || !bundleData.isBundle) {
            return res.status(404).send({ error: "Bundle not found" });
          } else if (!formIds?.length) {
            return res
              .status(400)
              .send({ error: "formIds not find in query string" });
          }
        }
        router.formio.resources.form.model.find(
          { _id: { $in: ids } },
          function (err, forms) {
            if (err) {
              return next(err);
            }
            if (!forms.length) {
              return res.status(404).send("Form not found");
            }
            const ignoredTypes = ["button"];
            const addedPaths = [];
            const metadata = [];
            for (const form of forms) {
              Utils.eachComponent(form.components, (com, path) => {
                const data = {
                  name: com.key,
                  label: com.label,
                  type: com.type,
                };
                let parentObject = null;
                if (path.includes(".")) {
                  const pathsArray = _.initial(path.split("."));
                  for (const singleKey of pathsArray) {
                    if (!parentObject) {
                      parentObject = metadata.find((i) => i.name === singleKey);
                    } else {
                      parentObject = parentObject.components.find(
                        (i) => i.name === singleKey
                      );
                    }
                    if (!parentObject.components) {
                      parentObject.components = [];
                    }
                    if (
                      !ignoredTypes.includes(com.type) &&
                      !addedPaths.includes(path)
                    ) {
                      parentObject.components.push(data);
                    }
                  }
                } else {
                  if (
                    !ignoredTypes.includes(com.type) &&
                    !addedPaths.includes(path)
                  ) {
                    metadata.push(data);
                  }
                }
                addedPaths.push(path);
              });
            }

            res.json(metadata);
          }
        );
      } catch (error) {
        next(error);
      }
    },
};
