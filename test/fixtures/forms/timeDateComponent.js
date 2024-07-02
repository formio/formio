module.exports = {
    formWithTimeDateWithSubmission: {
        title: "Test Date Time Component with Submission",
        name: "testDateTimeWithSubmission",
        path: "testdatetimewithsubmission",
        type: "form",
        display: "form",
        owner: "62e1332c98da5d30a9ea6510",
        components: [
            {
                label: "Date / Time",
                displayInTimezone: "submission",
                tableView: false,
                datePicker: {
                    disableWeekends: false,
                    disableWeekdays: false
                },
                enableMinDateInput: false,
                enableMaxDateInput: false,
                key: "dateTime",
                type: "datetime",
                input: true,
                widget: {
                    type: "calendar",
                    displayInTimezone: "submission",
                    locale: "en",
                    useLocaleSettings: false,
                    allowInput: true,
                    mode: "single",
                    enableTime: true,
                    noCalendar: false,
                    format: "yyyy-MM-dd hh:mm a",
                    hourIncrement: 1,
                    minuteIncrement: 1,
                    time_24hr: false,
                    minDate: null,
                    disableWeekends: false,
                    disableWeekdays: false,
                    maxDate: null
                }
            },
          {
              type: "button",
              label: "Submit",
              key: "submit",
              disableOnInvalid: true,
              input: true,
              tableView: false
          }
      ]
  
      },
      testDateTimeWithSubmissionInEditGrid: {
      title: "Test Date Time Component with Submission in Edit grid",
      name: "testDateTimeWithSubmissionInEditGrid",
      path: "testdatetimewithsubmissionineditgrid",
      type: "form",
      display: "form",
      owner: "62e1332c98da5d30a9ea6510",
      components: [
        {
            label: "Edit Grid",
            tableView: false,
            rowDrafts: false,
            key: "editGrid",
            type: "editgrid",
            displayAsTable: false,
            input: true,
            components: [
                {
                    label: "Date / Time",
                    displayInTimezone: "submission",
                    tableView: false,
                    datePicker: {
                        disableWeekends: false,
                        disableWeekdays: false
                    },
                    enableMinDateInput: false,
                    enableMaxDateInput: false,
                    key: "dateTime",
                    type: "datetime",
                    input: true,
                    widget: {
                        type: "calendar",
                        displayInTimezone: "submission",
                        locale: "en",
                        useLocaleSettings: false,
                        allowInput: true,
                        mode: "single",
                        enableTime: true,
                        noCalendar: false,
                        format: "yyyy-MM-dd hh:mm a",
                        hourIncrement: 1,
                        minuteIncrement: 1,
                        time_24hr: false,
                        minDate: null,
                        disableWeekends: false,
                        disableWeekdays: false,
                        maxDate: null
                    }
                }
            ]
        },
        {
            type: "button",
            label: "Submit",
            key: "submit",
            disableOnInvalid: true,
            input: true,
            tableView: false
        }
    ]

    }
  };
  