
module.exports = {
  components: [
    {
      "input": true,
      "type": "myowntype",
      "label": "Custom Field",
      "key": "customfield",
      "protected": false,
      "persistent": true
    }
  ],
  submission: {
    customfield: 'test value',
  }
};