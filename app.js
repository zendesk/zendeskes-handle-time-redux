(function() {
  var appParentSpace = this;
  
  //### Miscellaneous helper functions ###//
  var Helpers = {
    addSignificantZero: function(num) {
      return((num < 10 ? '0' : '') + num);
    },
    
    _isInt: function(num) {
      return (!isNaN(num) && (this._parseInt(num) == num));
    },
    
    _parseInt: function(num) {
      return parseInt(num, 0);
    }
  };
    
  //### Helper functions for manipulating dates ###//
  var DateHelpers = {
    formatDate: function(dateObject, format) {
      var dateString = format;
      
      dateString = dateString.replace('dd', Helpers.addSignificantZero(dateObject.getDate()));
      dateString = dateString.replace('mm', Helpers.addSignificantZero(dateObject.getMonth() + 1));
      dateString = dateString.replace('yyyy', dateObject.getFullYear());
      dateString = dateString.replace('HH', Helpers.addSignificantZero(dateObject.getHours()));
      dateString = dateString.replace('MM', Helpers.addSignificantZero(dateObject.getMinutes()));
      dateString = dateString.replace('SS', Helpers.addSignificantZero(dateObject.getSeconds()));

      return dateString;
    },
    
    getMonthName: function(month) {
      switch (month) {
        case 0: return "January";
        case 1: return "February";
        case 2: return "March";
        case 3: return "April";
        case 4: return "May";
        case 5: return "June";
        case 6: return "July";
        case 7: return "August";
        case 8: return "September";
        case 9: return "October";
        case 10: return "November";
        case 11: return "December";
        default: return "Error";
      }
    },
    
    parseDate: function(dateString, format) {
      var year = dateString.substr(format.search('yyyy'), 4);
      var month = dateString.substr(format.search('mm'), 2) - 1;
      var day = dateString.substr(format.search('dd'), 2);
      var hour = dateString.substr(format.search('HH'), 2);
      var minute = dateString.substr(format.search('MM'), 2);
      var second = dateString.substr(format.search('SS'), 2);
      
      return new Date(year, month, day, hour, minute, second);
    },
    
    shortDate: function(dateObject) {
      return this.getMonthName(dateObject.getMonth()).substr(0, 3) + ' ' + Helpers.addSignificantZero(dateObject.getDate());
    }
  };
  
  //### Helper functions for manipulating times ###//
  var TimeHelpers = {
    validateTime: function(time) {
      time = time.toString();
      
      if (time.match(/^\d{2,}:(?:[0-5]\d):(?:[0-5]\d)$/) || time.match(/^\d{2,}:(?:[0-5]\d)$/) || Helpers._isInt(time)) {
        return true;
      }
      
      else {
        return false;
      }
    },
    
    msToSeconds: function(ms) {
      return ms / 1000;
    },
    
    msToMinutes: function(ms) {
      return this.msToSeconds(ms) / 60;
    },
    
    minutesToMs: function(minutes) {
      return Helpers._parseInt(minutes * 60000);
    },
    
    humanToMs: function(timestring) {
      if (timestring.match(/^\d{2,}:(?:[0-5]\d):(?:[0-5]\d)$/) || timestring.match(/^\d{2,}:(?:[0-5]\d)$/)) {
        var time = timestring.split(':').map(function(i) {
          return Helpers._parseInt(i);
        }, this);
        
        var computedTime = 0;
  
        // If length is equal to 2 then the first element represents hours and the second minutes.
        // Else the first element represents minutes
  
        if (time.length === 3) {
          computedTime = (time[0] * 3600) + (time[1] * 60) + time[2];
        } else if (time.length === 2) {
          computedTime = (time[0] * 3600) + (time[1] * 60);
        } else {
          computedTime = time[0] * 60;
        }
  
        return computedTime * 1000;
      }
      
      else if (Helpers._isInt(timestring)) {
        return Helpers._parseInt(timestring) * 1000 * 60;
      }
      
      else {
        return false;
      }
    },
    
    msToObject: function(ms) {
      var time = Helpers._parseInt((ms / 1000));
      var seconds = time % 60;
      time = Helpers._parseInt(time/60);
      var minutes = time % 60;
      var hours = Math.floor(Helpers._parseInt(time/60));

      return {
        seconds: seconds,
        minutes: minutes,
        hours: hours
      };
    },
    
    prettyTime: function(timeObject) {
      return Helpers.addSignificantZero(timeObject.hours) + ':' +
        Helpers.addSignificantZero(timeObject.minutes) + ':' +
        Helpers.addSignificantZero(timeObject.seconds);
    }
  };
  
  return {
    displayed: true,                            // tracks whether the app should be displayed
    failed: false,                              // tracks whether update submission has failed due to missing handle time
    logged: false,                              // tracks whether handle time HAS been logged to the ticket
    mandatory: false,                           // tracks whether handle time MUST be logged to the ticket
    excluded: false,                            // tracks whether handle time ISN'T required due to exceptional criteria
    validFields: [],                            // stores fields available to current user
    excludeGroups: [],                          // stores groups for which handle time shouldn't be logged
    groupMemberships: [],                       // stores group memberships for current user
    handleTimeFields: [],                       // stores all handle time fields configured in app
    defaultGroup: null,                         // stores the user's default group
    defaultState: 'loading',                    // stores the default state
    startedTime: 0,                             // stores the time at which the counter began
    baseHistory: 0,                             // stores the current handle time history logged to the ticket
    baseTime: 0,                                // stores the current handle time logged to the ticket
    counterStarted: false,                      // tracks whether the handle time counter has started
    thresholdReached: false,                    // tracks whether enough time has elapsed that submission should be required
    uniqueID: '',                               // stores a unique identifier
    currentTab: 'totals',                       // tracks which tab is currently open so we can persist if template is reloaded
    error: false,                               // stores error messages that arise during execution
    
    events: {
      //### Framework Events ###//
      'app.activated'                           : 'activated',
      
      //### DOM Events ###//
      'click .ht_submit'                        : 'submitHandleTime',
      'click .ht_tab'                           : 'changeDisplayedTab',
      'click .ht_delete'                        : 'deleteHandleTime',
      'click .ht_toggle label'                  : 'toggleFormVisibility',
      'keypress input#ht_manual'                : 'keypressHandler',
      'click #form_error button.close'          : 'hideValidationError',

      //### Request Events ###//
      'getCurrentUser.done'                     : 'getUserGroups',

      //### Ticket Sidebar Events ###//
      'ticket.form.id.changed'                  : 'hideAndDisableAllFields',
      'ticket.requester.email.changed'          : 'loadIfDataReady',

      //### Submission Events ###//
      'ticket.save'                             : 'saveHandler',
      'ticket.submit.fail'                      : 'failHandler',
      'ticket.submit.done'                      : 'doneHandler'
    },
    
    requests: {
      getCurrentUser: function() {
        return {
          url: '/api/v2/users/' + this.currentUser().id() + '/group_memberships.json',
          type: 'GET',
          dataType: 'json',
          proxy_v2: true,
          processData: false
        }; 
      },
      
      updateTicket: function(attributes) {
        return {
          url: '/api/v2/tickets/' + this.ticket().id() + '.json',
          type: 'PUT',
          dataType: 'json',
          data: JSON.stringify(attributes),
          contentType: 'application/json',
          proxy_v2: true,
          processData: false
        };
      }
    },

    //### Framework Event Functions ###//
    activated: function() {
      if (this.setting("restrict_by_agent")) {
        var restrictedUsers = JSON.parse(this.setting("agent_restrictions"));        
        this.displayed = _.include(restrictedUsers, this.currentUser().email()) ? true : false;
      }
      
      if (this.displayed) {
        var fieldSettings = JSON.parse(this.setting("handle_time_fields"));
        
        this.handleTimeFields = fieldSettings.time_fields;
        this.excludeGroups = fieldSettings.exclude_groups;
        this.groupLookup = fieldSettings.group_lookup;
        this.fieldLookup = fieldSettings.field_lookup;
        this.nameLookup = fieldSettings.name_lookup;

        this.ajax('getCurrentUser');
      }
      
      else {
        this.hideApp();
      }
    },
    
    //### DOM Event Functions ###//
    submitHandleTime: function(clicked) {
      clicked.preventDefault();
      this.hideValidationError();
      
      var timeGroupName = this.$('#ht_group .zd-selectmenu-base-content').text();
      var time = 0;
      
      if (clicked.target.id == "ht_submit_manual") {
        time = TimeHelpers.humanToMs(this.$('#ht_manual').val());
      }
      
      else if (clicked.target.id == "ht_submit_elapsed") {
        time = Helpers._parseInt(this._elapsedTime());
      }
      
      this.addTime(time, timeGroupName, true);
      
      if (!this.error) {
        this.startedTime = new Date();
        this.logged = true;
        this.updateTemplate();
      }
      
      else {
        this.$('#form_error .error').text(this.error);
        this.$('#form_error .error').parent().show();
      }
    },
    
    changeDisplayedTab: function(clicked) {
      this.$('.nav-tabs > li.active').removeClass('active');
      this.$('#' + clicked.target.id).parent().addClass('active');
      
      if (clicked.target.id == 'tab_totals') {
        this.currentTab = 'totals';
        this.loadTotalsTemplate();
      }
      
      else if (clicked.target.id == 'tab_history') {
        this.currentTab = 'history';
        this.loadHistoryTemplate();
      }
      
      else {
        this.currentTab = 'totals';
        this.loadTotalsTemplate();
      }
    },
    
    deleteHandleTime: function(clicked) {
      var history = this.fetchHistory();

      var id = clicked.target.id.split("_");
      var date = DateHelpers.parseDate(id[0], 'yyyymmddHHMMSS');
      
      var agent = id[1];
      var group = id[2];

      var time = TimeHelpers.msToObject(id[3]);
      time = TimeHelpers.prettyTime(time);

      for (var i = 0; i < history.length; i++) {
        if (DateHelpers.parseDate(history[i].date, this.setting('history_timestamp_format')).toString() == date.toString() &&
            history[i].agent_id == agent &&
            history[i].group_id == group &&
            history[i].time == time &&
            (history[i].agent_id == this.currentUser().id() || this.currentUser().role() == 'admin')) {
          history.splice(i, 1);
          this.subtractTime(group, history);
          this.loadHistoryTemplate();
          break;
        }
      }
    },
    
    toggleFormVisibility: function(clicked) {
      if (clicked.target.id == "switch_manual_label") {
        this.$('#ht_elapsed_form').hide();
        this.$('#ht_manual_form').show();
      }
      else if (clicked.target.id == "switch_auto_label") {
        this.$('#ht_manual_form').hide();
        this.$('#ht_elapsed_form').show();
      }
      
      if (clicked.target.id == "switch_modal_manual_label") {
        this.$('#ht_modal_elapsed_form').hide();
        this.$('#ht_modal_manual_form').show();
      }
      else if (clicked.target.id == "switch_modal_auto_label") {
        this.$('#ht_modal_manual_form').hide();
        this.$('#ht_modal_elapsed_form').show();
      }
    },
    
    keypressHandler: function(keyPressed) {
      this.hideValidationError();
      
      if (keyPressed.which == 13) {
        keyPressed.preventDefault();
        
        var timeGroupName = this.$('#ht_group .zd-selectmenu-base-content').text();
        var time = TimeHelpers.humanToMs(this.$('#ht_manual').val());
        
        this.addTime(time, timeGroupName, true);
        
        if (!this.error) {
          this.startedTime = new Date();
          this.logged = true;
          this.updateTemplate();
        }
        
        else {
          this.$('#form_error .error').text(this.error);
          this.$('#form_error .error').parent().show();
        }
      }
    },
    
    //### Request Event Functions ###//
    getUserGroups: function(data) {
      this.validFields = [];
      this.groupMemberships = data.group_memberships;
      var groupIDs = _.pluck(this.groupMemberships, 'group_id');
      var restrictBy = _.pluck(this.handleTimeFields, 'group_id');
      
      for (var h = 0; h < this.groupMemberships.length; h++) {
        if (this.groupMemberships[h]["default"]) {
          this.defaultGroup = this.groupMemberships[h].group_id;
        }
      }
      
      var intersection = _.intersection(groupIDs, restrictBy);
      this.mandatory = _.include(restrictBy, this.defaultGroup);
      
      if (_.isEmpty(this.ticket().assignee().group())) {
        this.excluded = false;
      }
      else {
        this.excluded = _.include(this.excludeGroups, this.ticket().assignee().group().id());
      }
      
      if (intersection.length > 0) {
        for(var i = 0; i < this.handleTimeFields.length; i++) {
          if (this.handleTimeFields[i].group_id === this.defaultGroup) {
            this.handleTimeFields[i].default_group = true;
          }
          
          else {
            this.handleTimeFields[i].default_group = false;
          }
          
          for (var j = 0; j < intersection.length; j++) {
            if (this.handleTimeFields[i].group_id == intersection[j]) {
              this.validFields = this.validFields.concat(this.handleTimeFields[i]);
            }
          }
        }
        
        this.doneLoading = false;
        this.hideAndDisableAllFields();
        this.loadIfDataReady();
      }
      
      else {
        this.displayed = false;
        this.hideApp();
      }
    },
    
    //### Ticket Sidebar Event Functions ###//
    hideAndDisableAllFields: function() {
      var self = this;
      var timeFields = _.pluck(this.handleTimeFields, 'field_id');
      
      _.defer(function() {
        _.each(timeFields, function(fieldID) {
          if (self._timeFieldUI(fieldID)) {
            self._timeFieldUI(fieldID).hide();
            self._timeFieldUI(fieldID).disable();
          }
        }, timeFields);
                
        if (self._historyFieldUI()) {
          self._historyFieldUI().hide();
          self._historyFieldUI().disable();
        }
      });
    },
    
    loadIfDataReady: function() {
      if (!this.doneLoading && this.ticket() && this.displayed) {

        if (this.shouldNotRun()) {
          return this.displayError();
        }

        if (!this.counterStarted) {
          this.startCounter();
          this.counterStarted = true;
        }

        this.uniqueID = this._generateUniqueID();
        this.baseHistory = this.fetchHistory();
        this.updateTemplate();

        this.setDefaults();
        this.doneLoading = true;
      }
    },

    //### Submission Event Functions ###//
    saveHandler: function() {
      if (this.excluded || !this.displayed) {
        this.failed = false;
        return true;
      }
      
      else {
        if (!this.logged && this.mandatory) {
          services.appsTray().show();
          
          this.hideValidationError();
          this.$('#ht_modal').modal();
          var self = this;
          
          return self.promise(function(done, fail) {
            self.$('.ht_modal_submit').bind("click", function(clicked) {
              clicked.preventDefault();
              
              var timeGroupName = self.$('#ht_modal_group .zd-selectmenu-base-content').text();
              var time = 0;
              
              if (clicked.target.id == "ht_modal_submit_manual") {
                time = TimeHelpers.humanToMs(self.$('#ht_modal_manual').val());
              }
              
              else if (clicked.target.id == "ht_modal_submit_elapsed") {
                time = Helpers._parseInt(self._elapsedTime());
              }
              
              self.addTime(time, timeGroupName, false);
              
              if (!self.error) {
                self.startedTime = new Date();
                self.logged = true;
                self.updateTemplate();
                done();
              }
              
              else {
                self.$('#form_modal_error .error').text(this.error);
                self.$('#form_modal_error .error').parent().show();
              }
            });
            
            self.$('.modal-header button.close').bind("click", function() {
              self.logged = false;
              fail(self.I18n.t('submit.cancel'));
            });
            
            appParentSpace.$('.modal-backdrop').bind("click", function() {
              self.logged = false;
              fail(self.I18n.t('submit.cancel'));
            });
            
            self.$('input#ht_modal_manual').bind("keypress", function(keyPressed) {
              self.hideValidationError();
      
              if (keyPressed.which == 13) {
                var timeGroupName = self.$('#ht_group .zd-selectmenu-base-content').text();
                var time = TimeHelpers.humanToMs(self.$('#ht_modal_manual').val());
              
                self.addTime(time, timeGroupName, false);
                
                if (!self.error) {
                  self.startedTime = new Date();
                  self.logged = true;
                  self.updateTemplate();
                  done();
                }
                
                else {
                  self.$('#form_modal_error .error').text(self.error);
                  self.$('#form_modal_error .error').parent().show();
                }
              }
            });
            
            setTimeout(function() {
              self.logged = false;
              fail(self.I18n.t('submit.timeout'));
            }, 20000);
          });
        }
        
        else {
          this.failed = false;
          return true;
        }
      }
    },
    
    failHandler: function() {
      appParentSpace.$('#ht_modal').modal('hide');
      appParentSpace.$('.modal-backdrop').remove();
    },
    
    doneHandler: function() {
      appParentSpace.$('#ht_modal').modal('hide');
      appParentSpace.$('.modal-backdrop').remove();
    },
    
    //### Custom Functions ###//
    extractFromHistory: function(history, group_id) {
      if (_.isEmpty(history))
        return 0;

      return _.reduce(history, function(memo, current) {
        var time = current.time;
        if (current.group_id == group_id) {
          return memo + TimeHelpers.humanToMs(time);
        }
        
        else {
          return memo + 0;
        }
      }, 0, this);
    },

    hideApp: function() {
      this.switchTo('hidden');
      this.hideAndDisableAllFields();
    },
    
    updateTemplate: function() {
      this.switchTo('default', {
        can_submit_custom_time: this.setting("can_submit_custom_time"),
        can_submit_both_time: this.setting("can_submit_custom_time") && this.setting("can_submit_current_time"),
        custom_time: this._customTimeDefault(),
        custom_time_format: this._customTimeFormat(),
        unique_id: this.uniqueID,
        groups: _.sortBy(this.validFields, "order"),
        show_timer: !this.setting("hide_timer"),
        logged: this.logged,
        error: this.error
      });
      
      if (this.currentTab == 'totals') {
        this.loadTotalsTemplate();
      }
      
      else if (this.currentTab == 'history') {
        this.loadHistoryTemplate();
      }
    },
    
    loadTotalsTemplate: function() {
      var groups = _.sortBy(this.validFields, "order");
      var data = [];
      
      for (var i = 0; i < groups.length; i++) {
        var totalTime = TimeHelpers.msToMinutes(this.extractFromHistory(this.fetchHistory(), groups[i].group_id)).toFixed(0);
        data = data.concat([{"group_name" : groups[i].name, "group_id" : groups[i].group_id, "color" : groups[i].color, "total_time" : totalTime}]);
      }

      var historyTemplate = this.renderTemplate('totals', {records: data}); 
      this.$('#history-content').html(historyTemplate);
    },
    
    loadHistoryTemplate: function() {
      var history = this.fetchHistory();
      
      for (var i = 0; i < history.length; i++) {
        var date = DateHelpers.parseDate(history[i].date, this.setting('history_timestamp_format'));
        history[i].formatted_date = DateHelpers.shortDate(date);
        
        // Generate a pseudo-unique ID that identifies this entry for deletion purposes
        history[i].id =
          DateHelpers.formatDate(date, 'yyyymmddHHMMSS') + '_' +
          history[i].agent_id + '_' +
          history[i].group_id + '_' +
          TimeHelpers.humanToMs(history[i].time);
        
        /* If this handle time entry was logged by the current user or the current user is an admin,
           editable is true so that we can display an option to delete in the template */

        if (history[i].agent_id === this.currentUser().id() || this.currentUser().role() == 'admin') {
          history[i].editable = true;
        }
        
        else {
          history[i].editable = false;
        }
        
        for (var j = 0; j < this.handleTimeFields.length; j++) {
          if (history[i].group_id == this.handleTimeFields[j].group_id) {
            history[i].group_name = this.handleTimeFields[j].name;
            history[i].group_short_name = this.handleTimeFields[j].short_name;
          }
        }
      }
      
      var historyTemplate = this.renderTemplate('history', {records: history});
      this.$('#history-content').html(historyTemplate);
    },
    
    hideValidationError: function() {
      this.error = false;
      this.$('#form_error .error').text();
      this.$('#form_error .error').parent().hide();
    },

    shouldNotRun: function(){
      return (!(this.setting('can_submit_custom_time') ||
                this.setting('can_submit_current_time')) ||
              (!this.setting('active_on_new') &&
               this.ticket().status() === 'new') ||
              (this.ticket().status() === 'closed'));
    },

    displayError: function(){
      if (!(this.setting('can_submit_custom_time') ||
            this.setting('can_submit_current_time'))){
        this.switchTo('settings_error');
      }
    },

    startCounter: function(){
      if (_.isEmpty(this.timeLoopID)){
        this.startedTime = new Date();
        this.timeLoopID = this.setTimeLoop(this);
      }
    },

    setTimeLoop: function(self){
      return setInterval(function(){

        if (self.ticket() &&
            self.ticket().status()){

          var ms = self.setWorkedTime();

          if (ms >= self._thresholdToStart() && !self.thresholdReached && !this.excluded){
            self.logged = false;
            self.thresholdReached = true;
          }
        } else {
          self.destroy();
        }
      }, 1000);
    },

    destroy: function(){
      this.counterStarted = false;
      clearInterval(this.timeLoopID);
      this.timeLoopID = null;
      this.enableSave();
      this.thresholdReached = false;
      this.switchTo('loading');
    },
    
    fetchHistory: function() {
      return (_.isEmpty(this._historyField()) ? [] : JSON.parse(this._historyField()));
    },

    // Returns worked time as ms
    setWorkedTime: function(){
      var ms = this._elapsedTime();
      var elapsedTime = TimeHelpers.msToObject(ms);

      this.$('span.time-'+this.uniqueID).html(TimeHelpers.prettyTime(elapsedTime));

      return ms;
    },

    setDefaults: function(){
      this.setWorkedTime();
    },
    
    addTime: function(time, timeGroupName, inSidebar) {
      if (Helpers._isInt(time)) {
        var timeGroup = this.nameLookup[timeGroupName].group_id;
        var timeField = this.nameLookup[timeGroupName].field_id;
        this.baseHistory = this.fetchHistory();
        var newTime = TimeHelpers.prettyTime(TimeHelpers.msToObject(time));

        var newHistory = this.baseHistory.concat([{
          "date" : DateHelpers.formatDate(new Date(), this.setting('history_timestamp_format')),
          "agent_id" : this.currentUser().id(),
          "agent_name" : this.currentUser().name(),
          "group_id" : timeGroup,
          "field_id" : timeField,
          "time" : newTime
        }]);
        
        var customFields = [{ id: this.settings.timehistory, value: JSON.stringify(newHistory) }];
        this.ticket().customField(this._historyFieldLabel(), JSON.stringify(newHistory));
        //Updates the individual handle time fields on the ticket and returns an array of those fields and their new values
        customFields = customFields.concat(this.refreshTime(newHistory));
        
        if(inSidebar) {
          var attributes = { ticket: { custom_fields: [] }};
          attributes.ticket.custom_fields = customFields;
        
          this.ajax('updateTicket', attributes)
            .done(function() {
              this.error = false;
            })
            .fail(function() {
              this.error = this.I18n.t('errors.update_failed');
            });
        }
      }
      
      else {
        this.error = this.I18n.t('errors.invalid_time');
      }
    },
    
    subtractTime: function(timeGroup, revisedHistory) {
      var revisedTime = this.extractFromHistory(revisedHistory, timeGroup);
      var timeField = this.fieldLookup[timeGroup];

      var customFields = [{ id: this.settings.timehistory, value: JSON.stringify(revisedHistory) }];
      this.ticket().customField(this._historyFieldLabel(), JSON.stringify(revisedHistory));
      customFields = customFields.concat(this.refreshTime(revisedHistory));

      var attributes = { ticket: { custom_fields: [] }};
      attributes.ticket.custom_fields = customFields;
      
      this.ajax('updateTicket', attributes);
    },
    
    refreshTime: function(history) {
      var fields = this.handleTimeFields;
      var customFields = [];
      
      for (var i = 0; i < fields.length; i++) {
        var revisedTime = TimeHelpers.msToMinutes(this.extractFromHistory(history, fields[i].group_id)).toFixed(0);
        
        this.ticket().customField(this._timeFieldLabel(fields[i].field_id), revisedTime);
        customFields.push({ id: fields[i].field_id, value: revisedTime });
      }

      return customFields;
    },

    _prettyTotalTime: function(time){
      return TimeHelpers.prettyTime(TimeHelpers.msToObject(time)).slice(0,5);
    },
    _generateUniqueID: function(){
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);

        return v.toString(16);
      });
    },
    _customTimeDefault: function(){
      return _.map(this._customTimeFormat().split(':'),
                   function(i) { return "00";}).join(":");
    },
    _customTimeFormat: function(){
      return this.setting('custom_time_format') || "HH:MM";
    },
    _thresholdToStart: function(){
      return (Number(this.settings.start_threshold) || 15) * 1000;
    },
    _disableSaveInterval: function(){
      return (Number(this.settings.block_save_interval) || 5) * 1000;
    },

    _elapsedTime: function(){
      return new Date() - this.startedTime;
    },
    
    _timeFieldUI: function(fieldID){
      return this.ticketFields(this._timeFieldLabel(fieldID));
    },
    
    _historyFieldUI: function(){
      return this.ticketFields(this._historyFieldLabel());
    },
    
    _timeField: function(fieldID){
      return this.ticket().customField(this._timeFieldLabel(fieldID));
    },
    
    _historyField: function(){
      return this.ticket().customField(this._historyFieldLabel());
    },
    
    _timeFieldLabel: function(fieldID){
      return 'custom_field_' + fieldID;
    },
    
    _historyFieldLabel: function(){
      return 'custom_field_' + this.settings.timehistory;
    }
  };
}());