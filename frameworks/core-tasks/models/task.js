/*globals CoreTasks sc_require */

sc_require('models/record');

CoreTasks.NEW_TASK_NAME = '_NewTask';

// Types:
CoreTasks.TASK_TYPE_FEATURE = '_Feature';
CoreTasks.TASK_TYPE_BUG = '_Bug';
CoreTasks.TASK_TYPE_OTHER = '_Other'; // default
CoreTasks.taskTypesAllowed = [
  CoreTasks.TASK_TYPE_FEATURE,
  CoreTasks.TASK_TYPE_BUG,
  CoreTasks.TASK_TYPE_OTHER
];

CoreTasks.taskTypeWeights = {};
CoreTasks.taskTypeWeights[CoreTasks.TASK_TYPE_FEATURE] = 3;
CoreTasks.taskTypeWeights[CoreTasks.TASK_TYPE_BUG] = 2;
CoreTasks.taskTypeWeights[CoreTasks.TASK_TYPE_OTHER] = 1;


// Priorities:
CoreTasks.TASK_PRIORITY_HIGH = '_High';
CoreTasks.TASK_PRIORITY_MEDIUM = '_Medium'; // default
CoreTasks.TASK_PRIORITY_LOW = '_Low';
CoreTasks.taskPrioritiesAllowed = [
  CoreTasks.TASK_PRIORITY_HIGH,
  CoreTasks.TASK_PRIORITY_MEDIUM,
  CoreTasks.TASK_PRIORITY_LOW
];

CoreTasks.taskPriorityWeights = {};
CoreTasks.taskPriorityWeights[CoreTasks.TASK_PRIORITY_HIGH] = 3;
CoreTasks.taskPriorityWeights[CoreTasks.TASK_PRIORITY_MEDIUM] = 2;
CoreTasks.taskPriorityWeights[CoreTasks.TASK_PRIORITY_LOW] = 1;


// Development status:
CoreTasks.taskStatusesAllowed = [
  CoreTasks.STATUS_PLANNED,
  CoreTasks.STATUS_ACTIVE,
  CoreTasks.STATUS_DONE,
  CoreTasks.STATUS_RISKY
];

CoreTasks.taskStatusWeights = {};
CoreTasks.taskStatusWeights[CoreTasks.STATUS_RISKY] = 4;
CoreTasks.taskStatusWeights[CoreTasks.STATUS_ACTIVE] = 3;
CoreTasks.taskStatusWeights[CoreTasks.STATUS_PLANNED] = 2;
CoreTasks.taskStatusWeights[CoreTasks.STATUS_DONE] = 1;


// Validation status:
CoreTasks.TASK_VALIDATION_UNTESTED = '_Untested'; // default
CoreTasks.TASK_VALIDATION_PASSED = '_Passed';
CoreTasks.TASK_VALIDATION_FAILED = '_Failed';
CoreTasks.taskValidationsAllowed = [
  CoreTasks.TASK_VALIDATION_UNTESTED,
  CoreTasks.TASK_VALIDATION_PASSED,
  CoreTasks.TASK_VALIDATION_FAILED
];

CoreTasks.taskValidationWeights = {};
CoreTasks.taskValidationWeights[CoreTasks.TASK_VALIDATION_UNTESTED] = 3;
CoreTasks.taskValidationWeights[CoreTasks.TASK_VALIDATION_FAILED] = 2;
CoreTasks.taskValidationWeights[CoreTasks.TASK_VALIDATION_PASSED] = 1;

/**
 * The task model.
 *
 * A task represent an atomic unit of work to be done by someone.  They are grouped in projects.
 *
 * @extends CoreTasks.Record
 * @author Suvajit Gupta
 * @author Sean Eidemiller
 */
CoreTasks.Task = CoreTasks.Record.extend({

  recordType: 'Task',

  /**
   * A one-line summary of the task.
   */
  name: SC.Record.attr(String, { isRequired: YES, defaultValue: CoreTasks.NEW_TASK_NAME }),

  /**
   * A string summarizing key facets of the Task for display.
   */
  displayName: function(key, value) {

    if (value !== undefined) {

      var taskHash = CoreTasks.Task.parse(value, false);

      if(taskHash.priority) {
        this.propertyWillChange('priority');
        this.writeAttribute('priority', taskHash.priority);
        this.propertyDidChange('priority');
      }

      this.propertyWillChange('name');
      this.writeAttribute('name', taskHash.name);
      this.propertyDidChange('name');

      if(taskHash.effort) {
        this.propertyWillChange('effort');
        this.writeAttribute('effort', taskHash.effort);
        this.propertyDidChange('effort');
      }

      if(taskHash.submitterId) {
        var submitterNone = (taskHash.submitterId.toLowerCase() === CoreTasks.USER_NONE);
        var submitterUser = submitterNone? null : CoreTasks.getUserByLoginName(taskHash.submitterId);
        if (!submitterNone && !submitterUser) {
          console.warn('Task Editing Error - no such submitter: ' + taskHash.submitterId);
        }
        else {
          this.propertyWillChange('submitterId');
          this.writeAttribute('submitterId', submitterUser? submitterUser.get('id') : null);
          this.propertyDidChange('submitterId');
        }
      }

      if(taskHash.assigneeId) {
        var assigneeNone = (taskHash.assigneeId.toLowerCase() === CoreTasks.USER_NONE);
        var assigneeUser = assigneeNone? null : CoreTasks.getUserByLoginName(taskHash.assigneeId);
        if (!assigneeNone && !assigneeUser) {
          console.warn('Task Editing Error - no such assignee: ' + taskHash.assigneeId);
        }
        else {
          this.propertyWillChange('assigneeId');
          this.writeAttribute('assigneeId', assigneeUser? assigneeUser.get('id') : null);
          this.propertyDidChange('assigneeId');
        }
      }

      if(taskHash.type) {
        this.propertyWillChange('type');
        this.writeAttribute('type', taskHash.type);
        this.propertyDidChange('type');
      }

      if(taskHash.developmentStatus) {
        this.propertyWillChange('developmentStatus');
        if(this.get('developmentStatus') !== taskHash.developmentStatus &&
           taskHash.developmentStatus !== CoreTasks.STATUS_DONE) this.writeAttribute('validation', CoreTasks.TASK_VALIDATION_UNTESTED);
        this.writeAttribute('developmentStatus', taskHash.developmentStatus);
        this.propertyDidChange('developmentStatus');
      }

      if(taskHash.validation) {
        if(this.get('developmentStatus') !== CoreTasks.STATUS_DONE && taskHash.validation !== CoreTasks.TASK_VALIDATION_UNTESTED) {
          console.warn('Task Editing Error - validation of Passed/Failed only possible for status Done: ' + taskHash.name);
        }
        else {
          this.propertyWillChange('validation');
          this.writeAttribute('validation', taskHash.validation);
          this.propertyDidChange('validation');
        }
      }

    } else {
      return this.get('name');
    }

  }.property('name').cacheable(),

  /**
   * Refers to the project that this task is allocated to.
   */
  projectId: SC.Record.attr(Number),

  /**
   *  This computed property buffers changes to the projectId field.
   */
  projectValue: function(key, value) {

    if (value !== undefined) {
      var id = (value === 0)? null : value;
      this.propertyWillChange('projectId');
      this.writeAttribute('projectId', id);
      this.propertyDidChange('projectId');
    } else {
      value = this.get('projectId');
      if (value === null) value = 0;
    }

    return value;

  }.property('projectId').cacheable(),

  /**
   * The priority of the task.
   */
  priority: SC.Record.attr(String, {
    isRequired: YES,
    defaultValue: CoreTasks.TASK_PRIORITY_MEDIUM,
    allowed: CoreTasks.taskPrioritiesAllowed
  }),

  /**
   * The effort of the task (can start with an estimate and end with the actual).
   */
  effort: SC.Record.attr(String),

  /**
   * Append unit of time after effort.
   */
  displayEffort: function() {
    return CoreTasks.displayTime(this.get('effort'));
  }.property('effort').cacheable(),

  /**
   *  This computed property buffers changes to the effort field.
   */
  effortValue: function(key, value){
    if (value !== undefined) {
      if(value === '') {
        this.propertyWillChange('effort');
        this.writeAttribute('effort', null);
        this.propertyDidChange('effort');
      }
      else {
        var effort = CoreTasks.Task.parseEffort('{' + value + '}');
        if(effort) {
          this.propertyWillChange('effort');
          this.writeAttribute('effort', effort);
          this.propertyDidChange('effort');
          value = effort;
        }
      }
    }
    else {
      value = this.get('effort');
    }
    return value;
  }.property('effort').cacheable(),

  /**
   * The user who creates the task.
   */
  submitterId: SC.Record.attr(Number),

  submitter: function(key, value) {
    if (value !== undefined) {
      if (value && value.get) this.writeAttribute('submitterId', value.get('id'));
    } else {
      var id = this.get('submitterId');
      if (id) {
        value = CoreTasks.store.find(CoreTasks.User, id);
      } else {
        value = null;
      }
    }

    return value;

  }.property('submitterId').cacheable(),

  /**
   *  This computed property buffers changes to the submitterId field.
   */
  submitterValue: function(key, value) {

    if (value !== undefined) {
      var id = (value === 0)? null : value;
      this.propertyWillChange('submitterId');
      this.writeAttribute('submitterId', id);
      this.propertyDidChange('submitterId');
    } else {
      value = this.get('submitterId');
      if (value === null) value = 0;
    }

    return value;

  }.property('submitterId').cacheable(),

  /**
  * The user who is assigned to complete the task.
   */
  assigneeId: SC.Record.attr(Number),

  assignee: function(key, value){
    if (value !== undefined) {
      if (value && value.get) this.writeAttribute('assigneeId', value.get('id'));
    } else {
      var id = this.get('assigneeId');
      if (id) {
        value = CoreTasks.store.find(CoreTasks.User, id);
      } else {
        value = null;
      }
    }

    return value;

  }.property('assigneeId').cacheable(),

  /**
   *  This computed property buffers changes to the assigneeId field.
   */
  assigneeValue: function(key, value) {

    if (value !== undefined) {
      var id = (value === 0)? null : value;
      this.propertyWillChange('assigneeId');
      this.writeAttribute('assigneeId', id);
      this.propertyDidChange('assigneeId');
    } else {
      value = this.get('assigneeId');
      if (value === null) value = 0;
    }

    return value;

  }.property('assigneeId').cacheable(),

  /**
   * The type of the task (see below for possible values).
   */
  type: SC.Record.attr(String, {
    isRequired: YES,
    defaultValue: CoreTasks.TASK_TYPE_OTHER,
    allowed: CoreTasks.taskTypesAllowed
  }),

  /**
   * The development status of the task (see below for allowed values).
   */
  developmentStatus: SC.Record.attr(String, {
    isRequired: YES,
    defaultValue: CoreTasks.STATUS_PLANNED,
    allowed: CoreTasks.taskStatusesAllowed
   }),

   /**
    * Buffers changes to developmentStatus making appropriate changes to validation.
    */
  developmentStatusWithValidation: function(key, value){
     var currentStatus = this.get('developmentStatus');
     if (value && currentStatus !== value) {
       this.set('developmentStatus', value);
       if(value !== CoreTasks.STATUS_DONE) this.set('validation', CoreTasks.TASK_VALIDATION_UNTESTED)
     }
     else {
       return currentStatus;
     }
   }.property('developmentStatus').cacheable(),

  /**
   * The validation status of the task (see below for allowed values).
   */
  validation: SC.Record.attr(String, {
    isRequired: YES,
    defaultValue: CoreTasks.TASK_VALIDATION_UNTESTED,
    allowed: CoreTasks.taskValidationsAllowed
  }),

  /**
   * The path to the icon associated with a task.
   */
  icon: function() {
    switch (this.get('type')){
      case CoreTasks.TASK_TYPE_FEATURE:
        return 'task-icon-feature';
      case CoreTasks.TASK_TYPE_BUG:
        return 'task-icon-bug';
      case CoreTasks.TASK_TYPE_OTHER:
        return 'task-icon-other';
    }
  }.property('type').cacheable(),

  /**
  * Export a task's attributes.
  *
  * @param {String} format in which data is to be exported.
  * @returns {String) return a string with the tasks' data exported in it.
  */
  exportData: function(format) {

    var priority = this.get('priority');
    var developmentStatus = this.get('developmentStatus');
    var validation = this.get('validation');
    var type = this.get('type');

    var ret = '';
    if(format === 'HTML') {
      ret += '<p><span class="id ' + validation.loc().toLowerCase() + '">' + this.get('displayId') + '</span><span class="margin">&nbsp;</span>';
      ret += '&nbsp;<span class="' + type.loc().toLowerCase() + '">&nbsp;</span>';
      ret += '&nbsp;<span class="' + priority.loc().toLowerCase() + ' ' + developmentStatus.loc().toLowerCase() + '">';
    }
    else{
      var val;
      switch(priority) {
        case CoreTasks.TASK_PRIORITY_HIGH: val = '^'; break;
        case CoreTasks.TASK_PRIORITY_MEDIUM: val = '-'; break;
        case CoreTasks.TASK_PRIORITY_LOW: val = 'v'; break;
      }
      ret += val + ' ';
    }

    if(format === 'HTML') ret += '<span class="name">';
    ret += this.get('name');
    if(format === 'HTML') ret += '</span></span>';

    var effort = this.get('effort');
    if(effort) {
      var doneEffortRange = false;
      if(developmentStatus === CoreTasks.STATUS_DONE && effort.match(/\-/)) doneEffortRange = true;
      if(format === 'HTML') ret += '&nbsp;<span class="effort' + (doneEffortRange? ' done-effort-range-warning' : '') + '">';
      else ret += ' {';
      ret += CoreTasks.displayTime(effort);
      if(format === 'HTML') ret += '</span>';
      else ret += '}';
    }

    if(format === 'HTML')  ret += '</p>';
    else {
      var submitter = this.get('submitter');
      if (submitter) ret += ' <' + submitter.get('loginName') + '>';

      var assignee = this.get('assignee');
      if (assignee) ret += ' [' + assignee.get('loginName') + ']';

      if(type !== CoreTasks.TASK_TYPE_OTHER) ret += ' $' + type.loc();

      if(developmentStatus !== CoreTasks.STATUS_PLANNED) ret += ' @' + developmentStatus.loc();
      if(validation !== CoreTasks.TASK_VALIDATION_UNTESTED) ret += ' %' + validation.loc();

      if(this.get('id') > 0) ret += ' ' + this.get('displayId');
    }

    val = this.get('description');
    if(val) {
      if(format === 'HTML') ret += '\n<pre>';
      var lines = val.split('\n');
      for (var j = 0; j < lines.length; j++) {
        ret += '\n';
        if(format === 'Text') ret += '| ';
        ret += lines[j];
      }
      if(format === 'HTML') ret += '\n</pre>';
    }

    ret += '\n\n';
    return ret;

  },

  /**
   * Custom destroy to delete any watches for this task.
   */
  destroy: function() {
    // console.log('DEBUG: destroying Task: ' + this.get('name'));
    sc_super();
    this._destroyWatches();
    this._destroyComments();
  },

  _destroyWatches: function() {
    var watches = CoreTasks.getTaskWatches(this);
    for(var i = 0; i < watches.length; i++) {
      // console.log('DEBUG: deleting watch ' +  watches[i]);
      watches[i].destroy();
    }
  },

  _destroyComments: function() {
    var comments = CoreTasks.getTaskComments(this);
    for(var i = 0; i < comments.length; i++) {
      // console.log('DEBUG: deleting comment ' +  comments[i]);
      comments[i].destroy();
    }
  },

  /**
   * A read-only computed property that returns the list of watches for this task
   * before it was first persisted.
   *
   * @returns {SC.RecordArray} An array of watches.
   */
  disassociatedWatches: function() {
    if(SC.none(this.get('_id'))) return null;

    // Create the query if necessary.
    if (!this._disassociatedWatchesQuery) {
      this._disassociatedWatchesQuery = SC.Query.local(CoreTasks.Watch, "taskId=%@".fmt(this.get('_id')));
      this._disassociatedWatchesQuery.set('initialServerFetch', NO);
    }

    // Execute the query and return the results.
    return this.get('store').find(this._disassociatedWatchesQuery);
  }.property('_id').cacheable(),

  /**
   * A read-only computed property that returns the list of comments for this task
   * before it was first persisted.
   *
   * @returns {SC.RecordArray} An array of comments.
   */
  disassociatedComments: function() {
    if(SC.none(this.get('_id'))) return null;

    // Create the query if necessary.
    if (!this._disassociatedCommentsQuery) {
      this._disassociatedCommentsQuery = SC.Query.local(CoreTasks.Comment, "taskId=%@".fmt(this.get('_id')));
      this._disassociatedCommentsQuery.set('initialServerFetch', NO);
    }

    // Execute the query and return the results.
    return this.get('store').find(this._disassociatedCommentsQuery);
  }.property('_id').cacheable()

});

CoreTasks.Task.mixin(/** @scope CoreTasks.Task */ {

  resourcePath: 'task',

  /**
   * Parse a string and extract effort from it.
   *
   * @param {String} string to extract effort from.
   * @returns {String} Task effort (number or range).
   */
  parseEffort: function(line) {

    var taskEffort = null;

    var matches = line.match(/\{/g);
    if(matches !== null) {
      if(matches.length === 1) {
        var taskEffortMatches = /\{(\d+\.\d+-\d+\.\d+|\d+\.\d+-\d+|\d+-\d+\.\d+|\d+-\d+|\d+\.\d+|\d+)(|d|h)\}/.exec(line);
        if(taskEffortMatches) {
          taskEffort = taskEffortMatches[1];
          if(taskEffortMatches[2]) taskEffort += taskEffortMatches[2];
        }
        else {
          console.warn('Task Parsing Error - illegal effort');
        }
      }
      else {
        console.warn('Task Parsing Error - multiple efforts illegal');
      }
    }

    return taskEffort;
  },

  /**
   * Parse a line of text and extract parameters from it.
   *
   * @param {String} string to extract parameters from.
   * @param (Boolean) optional parameter to specify if defaults are to be filled in
   * @returns {Object} Hash of parsed parameters.
   */
  parse: function(line, fillDefaults) {

    if (fillDefaults === undefined) fillDefaults = true;

    // extract priority based on bullet, if one is provided
    var taskPriority = fillDefaults? CoreTasks.TASK_PRIORITY_MEDIUM : null;
    var taskBulletMatches = line.match(/^\s*([\^\-v])\s+/);
    if(taskBulletMatches) {
      line = line.replace(taskBulletMatches[0], '');
      switch(taskBulletMatches[1]) {
        case '^':
          taskPriority = CoreTasks.TASK_PRIORITY_HIGH;
          break;
        case '-':
          taskPriority = CoreTasks.TASK_PRIORITY_MEDIUM;
          break;
        case 'v':
          taskPriority = CoreTasks.TASK_PRIORITY_LOW;
          break;
      }
    }

    // extract task name
    var taskNameMatches = /^\s*(^[^\{<\[\$@%#]+)/.exec(line);
    var taskName = taskNameMatches? taskNameMatches[1].replace(/\s*$/, '') : line;

    // extract task effort
    var taskEffort = CoreTasks.Task.parseEffort(line);

    // extract task assignee
    var taskAssignee = null;
    var taskAssigneeMatches = line.match(/\[[\w\s]+\]/g);
    if(taskAssigneeMatches) {
      if(taskAssigneeMatches.length === 1) taskAssignee = taskAssigneeMatches[0].slice(1, taskAssigneeMatches[0].length-1);
      else console.warn('Task Parsing Error - multiple assignees illegal: ' + taskAssigneeMatches);
    }

    // extract task submitter
    var taskSubmitter = null;
    var taskSubmitterMatches = line.match(/\<[\w\s]+\>/g);
    if(taskSubmitterMatches) {
      if(taskSubmitterMatches.length === 1) taskSubmitter = taskSubmitterMatches[0].slice(1, taskSubmitterMatches[0].length-1);
      else console.warn('Task Parsing Error - multiple submitters illegal: ' + taskSubmitterMatches);
    }

    // extract task type
    var taskType = fillDefaults? CoreTasks.TASK_TYPE_OTHER : null;
    var taskTypeMatches = line.match(/\$(\w+)/g);
    if(taskTypeMatches) {
      if(taskTypeMatches.length === 1) {
        var type = CoreTasks.normalizeLocalizedString('_' + taskTypeMatches[0].slice(1));
        if(CoreTasks.taskTypesAllowed.indexOf(type) === -1) {
          console.warn('Task Parsing Error - illegal type: ' + type);
        }
        else {
          taskType = type;
        }
      }
      else {
        console.warn('Task Parsing Error - multiple types illegal: ' + taskTypeMatches);
      }
    }

    // extract task development status
    var taskStatus = fillDefaults? CoreTasks.STATUS_PLANNED : null;
    var taskStatusMatches = line.match(/@(\w+)/g);
    if(taskStatusMatches) {
      if(taskStatusMatches.length === 1) {
        var status = CoreTasks.normalizeLocalizedString('_' + taskStatusMatches[0].slice(1));
        if(CoreTasks.taskStatusesAllowed.indexOf(status) === -1) {
          console.warn('Task Parsing Error - illegal status: ' + status);
        }
        else {
          taskStatus = status;
        }
      }
      else {
        console.warn('Task Parsing Error - multiple statuses illegal: ' + taskStatusMatches);
      }
    }

    // extract task validation
    var taskValidation = fillDefaults? CoreTasks.TASK_VALIDATION_UNTESTED : null;
    var taskValidationMatches = line.match(/%(\w+)/g);
    if(taskValidationMatches) {
      if(taskValidationMatches.length === 1) {
        var validation = CoreTasks.normalizeLocalizedString('_' + taskValidationMatches[0].slice(1));
        if(CoreTasks.taskValidationsAllowed.indexOf(validation) === -1) {
          console.warn('Task Parsing Error - illegal validation: ' + validation);
        }
        else {
          taskValidation = validation;
          if((taskStatus !== null && taskStatus !== CoreTasks.STATUS_DONE) && taskValidation !== CoreTasks.TASK_VALIDATION_UNTESTED) {
            taskValidation = null;
            console.warn('Task Parsing Error - validation of Passed/Failed only possible for status Done: ' + taskName);
          }
        }
      }
      else {
        console.warn('Task Parsing Error - multiple validations illegal: ' + taskValidationMatches);
      }
    }

    var ret = {
      name: taskName,
      priority: taskPriority,
      effort: taskEffort,
      assigneeId: taskAssignee,
      submitterId: taskSubmitter,
      type: taskType,
      developmentStatus: taskStatus,
      validation: taskValidation
    };
    // console.log('DEBUG: Task hash = ' + JSON.stringify(ret));
    return ret;

  }

});

CoreTasks.Task.NEW_TASK_HASH = {
  name: CoreTasks.NEW_TASK_NAME,
  type: CoreTasks.TASK_TYPE_OTHER,
  priority: CoreTasks.TASK_PRIORITY_MEDIUM,
  developmentStatus: CoreTasks.STATUS_PLANNED,
  validation: CoreTasks.TASK_VALIDATION_UNTESTED
};
