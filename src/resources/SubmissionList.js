const { ObjectId } = require("../util/util");

module.exports = {
  getAllSubmissions: (router) =>
    async function (req, res, next) {
      try { 
        const userRoles = req.user.roles.map((id) => ObjectId(id)); 

        // submissionIds taking from req.body
        const submissionIds = req.body.submissionIds
          ? req.body.submissionIds.map((id) => ObjectId(id.trim()))
          : []; 

          const pipeline = [
            {
              $match: {
                _id: { $in: submissionIds }, // Filter by submission IDs
              },
            },
            {
              $lookup: {
                from: "forms",
                localField: "form",
                foreignField: "_id",
                as: "formDetails",
              },
            },
            {
              $unwind: "$formDetails",
            },
            {
              $match: {
                $or: [
                  {
                    "formDetails.submissionAccess": {
                      $elemMatch: {
                        type: "read_all",
                        roles: { $in: userRoles },
                      },
                    },
                  },
                  {
                    owner: ObjectId(req.user._id), // User must be the owner for read_own
                  },
                ],
              },
            },
            {
              "$project":{
                formDetails:0
              }
            }
          ];
        // mongo query execute
        const result = await router.formio.resources.submission.model.aggregate(pipeline)
        res.json(result)
      } catch (error) {
        next(error);
      }
    },
};
