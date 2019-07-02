module.exports = {
  enabled: true,
  methods: {
    sendSMS: {
      method: "GET",
      url: "http://api.smsnhanh.com/v2/",
      arguments: {
        default: {
          query: {
            Accesskey: '77OPQF77', Type: 'VIP'
          }
        },
        transform: function(PhoneNumber, Text) {
          var q = {};
          if (PhoneNumber != null) {
            q.PhoneNumber = PhoneNumber;
          }
          if (Text != null) {
            q.Text = Text;
          }
          return { query: q }
        }
      }
    }
  }
}
