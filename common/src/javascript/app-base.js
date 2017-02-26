Ext.define("RallyTechServices.filtereddefectapps.AppBase", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selector_box', layout: 'hbox'},
        {xtype:'container',itemId:'filter_box', flex: 1},
        {xtype:'container',itemId:'display_box', tpl: '<div class="no-data-container"><div class="secondary-message">{message}</div></div>'}
    ],

    integrationHeaders : {
        name : "RallyTechServices.filtereddefectapps.AppBase"
    },

    config: {
        defaultSettings: {
            includeStates: [],
            includeMilestones: [],
            includePriorities: [],
            dateRange: 30,
            startDate: null,
            endDate: null
        }
    },

    modelType: 'Defect',
    includeStateFilter: false,
    includePriorityPicker: false,
    includeMilestonePicker: false,
    includeTagPicker: true,
    defectStates: null,

    /**
     * Format for dates in chart and matrix columns
     */
    dateFormat: 'Y-m-d',

    /**
     * if the milestone picker is in the app settings, then we will need to store some extra data
     * for the milestones selected so that we can decorate the plot lines appropriately
     *
     * This is a hash of oid keys and data objects
     */
    milestoneData: {},

    launch: function(){
        this.logger.log('launch settings', this.getSettings());

        var promises = [RallyTechServices.filtereddefectapps.common.Toolbox.fetchDefectStates()];
        if (!this.includeMilestonePicker){
            promises.push(this._fetchMilestoneData());
        }

        Deft.Promise.all(promises).then({
            success: function(results){

                this.defectStates = results[0][0];
                this.defectPriorities = results[0][1];
                this.logger.log('results', results, this.defectStates);
                if (results.length > 1){
                    this.milestoneData = results[1];
                    this.logger.log('launch milestoneData', this.milestoneData);
                }
                if (this.validateSettings()){
                    this._addSelectors();
                }
            },
            failure: this.showErrorNotification,
            scope: this
        });

    },
    validateSettings: function(){
        var activeStates = this.getActiveDefectStates();
        this.logger.log('validateSettings', activeStates);
        if (!activeStates || activeStates.length === 0){
            this.down('#display_box').update({message: "Please use the app settings to configure at least 1 active defect state."});
            return false;
        }
        return true;
    },
    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getActiveDefectStates: function(){
        var activeStates = this.getSetting('includeStates') || [];
        if (Ext.isArray(activeStates)){
            return activeStates;
        }
        return activeStates.split(',');
    },
    _addSelectors: function() {
        this.getSelectorBox().removeAll();

        if (this.includeStateFilter){
            var sb = this.getSelectorBox().add({
                xtype: 'rallyfieldvaluecombobox',
                itemId: 'statePicker',
                margin: '25 5 5 5',
                fieldLabel: '',
                emptyText: 'Filter by State...',
                model: this.modelType,
                field: "State",
                multiSelect: true,
                labelAlign: 'right',
                stateful: true,
                stateId: this.getContext().getScopedStateId('statePicker'),
                width: 200
            });
            sb.on('select', this._selectorsUpdated, this);
            sb.on('change', this._checkFilterCleared, this);
        }

        if (this.includePriorityPicker){
            var pb = this.getSelectorBox().add({
                xtype: 'rallyfieldvaluecombobox',
                itemId: 'priorityPicker',
                margin: '25 5 5 5',
                fieldLabel: '',
                model: this.modelType,
                emptyText: 'Filter by Priority...',
                field: "Priority",
                multiSelect: true,
                labelAlign: 'right',
                stateful: true,
                stateId: this.getContext().getScopedStateId('priorityPicker'),
                width: 200
            });
            pb.on('select', this._selectorsUpdated, this);
            pb.on('change', this._checkFilterCleared, this);
        }

       if (this.includeMilestonePicker){
           var mb = this.getSelectorBox().add({
               xtype: 'rallymilestonepicker',
               storeConfig: {
                   context: {project: null},
                   fetch: ['Name','TargetDate','DisplayColor']
               },
               matchFieldName: "Name",
               emptyText: 'Filter by Milestones...',
               margin: '25 5 5 5',
               fieldLabel: '',
               labelAlign: 'right',
               labelSeparator: '',
               showSearchIcon: true,
               itemId: 'milestonePicker',
               stateId: this.getContext().getScopedStateId('milestonePicker'),
               stateful: true,
               width: 200
           });
           mb.on('selectionchange', this._selectorsUpdated, this);
       }

        if (this.includeTagPicker){
            var tb = this.getSelectorBox().add({
                xtype: 'rallytagpicker',
                margin: '25 5 5 5',
                emptyText: 'Filter by Tags...',
                labelSeparator: '',
                itemId: 'tagPicker',
                stateId: this.getContext().getScopedStateId('tagPicker'),
                stateful: true,
                width: 200
            });
            tb.on('selectionchange', this._selectorsUpdated, this);
        }
        this._selectorsUpdated();
    },
    _selectorsUpdated: function(cb){
        //update the selectors with text
        if (cb && (cb.itemId === 'tagPicker' || cb.itemId === 'milestonePicker')){
            var values = cb.getValue(),
                text = "";
            this.logger.log('updateView pickerValues', cb.getValue(), values.length);
            if (values.length > 0){
                text = values[0].get('Name');
                if (values.length > 1){
                    text = Ext.String.format("{0} (+{1})",text, values.length - 1);
                }
            }
            cb.setValueText(text);
        }
        this.fireEvent('filtersupdated', this.getFilterFindConfig());
    },
    getMilestones: function(){
        var milestones = Ext.Array.map(Ext.Object.getKeys(this.milestoneData), function(k){ return Number(k);});
        if (this.includeMilestonePicker){
           milestones = this.down('#milestonePicker') && this.down('#milestonePicker').getValue() || [];
           this.milestoneData = _.reduce(milestones, function(obj, m){
               obj[m.get('ObjectID')] = m.getData();
               return obj;
           }, {});
           return this.getObjectIDList(milestones);
        }

        this.logger.log('getMilestones', milestones);
        return milestones;

    },
    getPriorities: function(){
        if (this.includePriorityPicker){
            return this.down('#priorityPicker') & this.down('#priorityPicker').getValue() || [];
        }
        var priorities = this.getSetting('includePriorities') || [];
        this.logger.log('getPriorities', priorities);
        if (priorities && Ext.isString(priorities)){
            priorities = priorities.split(',');
        }
        return priorities;

    },

    getFilterFindConfig: function(){
        var milestones = this.getMilestones(),
            tags = this.down('rallytagpicker').getValue(),
            states = this.down('#statePicker') && this.down('#statePicker').getValue(),
            priorities = this.getPriorities();

        this.logger.log('getFilterFindConfig',states, milestones, tags || 'no tags', priorities);

        var findConfig = {
            _TypeHierarchy: this.modelType
        };

        if (milestones && milestones.length > 0){
            findConfig.Milestones = {$in: milestones };
        }

        if (tags && tags.length > 0){
            findConfig.Tags = {$in: this.getObjectIDList(tags) }
        }

        if (states && states.length > 0){
            findConfig.State = {$in: states};
        }

        if (priorities && priorities.length > 0){
            findConfig.Priority = {$in: priorities};
        }
        this.logger.log('getFilterFindConfig', findConfig);
        return findConfig;
    },

    _checkFilterCleared: function(cb, newValue, oldValue){
        //This is a hack because for some reason the dropdown is firing the change
        //event on initialization and it does not fire the select event when teh
        //list is cleared out.
        //So, in this function, we are only checking that the new value = [], which
        //means that someone unselected all options and that we shouldn't filter on that field.
        this.logger.log('checkFilterCleared', cb.itemId, newValue, oldValue, cb.getValue());
        if (newValue && newValue.length === 0){
            //this is an empty array
            this.updateView();
        }
    },
    getPlotlines: function(){
        var plotLines = [];

        this.logger.log('getPlotlines', this.milestoneData);

        Ext.Object.each(this.milestoneData, function(oid, data){
            this.logger.log('getPlotlines', oid, data);
            if (data.TargetDate){

                var day = this.getStartDate(),
                    dateIndex = 0;

                while (data.TargetDate > day){
                    day = Rally.util.DateTime.add(day, 'day', 1);
                    if (day.getDay() > 0 && day.getDay() < 6){
                        dateIndex++;
                    }
                }

                var color = data.DisplayColor || "#F6F6F6",
                    style = 'solid';
                if (color === "##F6F6F6"){
                    style = 'dash';
                }
                plotLines.push({
                    color: color,
                    dashStyle: style,
                    width: 2,
                    value: dateIndex-1,
                    label: {
                        rotation: 0,
                        y: 15,
                        style: {
                            color: '#888',
                            fontSize: '11px',
                            fontFamily: 'ProximaNovaSemiBold',
                            fill: '#888'
                        },
                        text: data.Name
                    },
                    zIndex: 3
                });
            }
        }, this);
        return plotLines;

    },
    _fetchMilestoneData: function(){

        var milestoneOids = this.getSetting('includeMilestones') || [];
        this.logger.log('getMilestones includeMilestones setting', milestoneOids);
        if (milestoneOids && Ext.isString(milestoneOids)){
            milestoneOids = milestoneOids.split(',');
        }
        milestoneOids = Ext.Array.map(milestoneOids, function(m){
            return Number(m.split('/').slice(-1)[0]);  //pull the objectID off of the reference
        });

        var deferred = Ext.create('Deft.Deferred');

        if (milestoneOids && milestoneOids.length > 0){
            var filters = Ext.Array.map(milestoneOids, function(m){
                return {
                    property: "ObjectID",
                    value: m
                };
            });
            filters = Rally.data.wsapi.Filter.or(filters);

            Ext.create('Rally.data.wsapi.Store', {
                fetch: ['FormattedID','Name','TargetDate','DisplayColor'],
                filters: filters,
                model: 'Milestone',
                limit: milestoneOids.length
            }).load({
                callback: function(records, operation){
                    if (operation.wasSuccessful()){
                        var milestoneMap = _.reduce(records, function(memo, r){
                            memo[r.get('ObjectID')] = r.getData();
                            return memo;
                        }, {});
                        deferred.resolve(milestoneMap);
                    } else {
                        deferred.resolve('Error loading milestone data: ' + operation.error.errors.join(','));
                    }
                }
            });

        } else {
            deferred.resolve({});
        }
        return deferred.promise;
    },
    getObjectIDList: function(records){
        return Ext.Array.map(records, function(r){
            return r.get('ObjectID');
        });
    },
    getModelNames: function(){
        return [this.modelType];
    },
    getSelectorBox: function(){
        return this.down('#selector_box');
    },
    getDisplayBox: function(){
        return this.down('#display_box');
    },

    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    getSettingsFields: function(){
        var states = this.defectStates,
            includeStates = this.getSetting('includeStates') || [];

        if (Ext.isString(includeStates)){
            includeStates = includeStates.split(',');
        }

        var priorities = this.getSetting('includePriorities') || [];
        if (Ext.isString(priorities)){
            priorities = priorities.split(',');
        }

        var milestones = this.getSetting('includeMilestones');

        this.logger.log('getSettingsFields', includeStates, priorities, milestones, states);

        var labelWidth = 150,
            stateOptions = _.map(states, function(s){
                var checked = Ext.Array.contains(includeStates, s);
                return { boxLabel: s, name: 'includeStates', inputValue: s, checked: checked };
            }),
            priorityOptions = _.map(this.defectPriorities, function(p){
                var checked = Ext.Array.contains(priorities, p);
                return { boxLabel: p, name: 'includePriorities', inputValue: p, checked: checked };
            });

        var settingsControls= [];


        if (!this.includeMilestonePicker){
            settingsControls.push({
                xtype: 'rallymilestonepicker',
                storeConfig: {
                    context: {project: null},
                    fetch: ['Name','TargetDate','DisplayColor']
                },
                matchFieldName: "Name",
                //autoExpand: true,
                emptyText: 'Configure Milestones...',
                margin: 5,
                fieldLabel: 'Milestone(s)',
                labelAlign: 'right',
                labelWidth: labelWidth,
                labelSeparator: '',
                name: 'includeMilestones',
                selectionKey: '_ref',
                value: milestones,
                width: 400,
                listeners: {
                    selectionchange: function(p){
                        p.syncSelectionText();
                    }
                }
            });
        }

        settingsControls.push({
            xtype: 'checkboxgroup',
            fieldLabel: 'Active States',
            labelAlign: 'right',
            labelWidth: labelWidth,
            columns: 3,
            width: 600,
            margin: '0 0 25 0',
            vertical: true,
            items: stateOptions
        });

        if (!this.includePriorityPicker) {
            settingsControls.push({
                xtype: 'checkboxgroup',
                fieldLabel: 'Include Priorities',
                labelAlign: 'right',
                labelWidth: labelWidth,
                columns: 3,
                width: 600,
                margin: '0 0 25 0',
                vertical: true,
                items: priorityOptions
            });
        }
        return settingsControls;
    },
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    getMilestoneSubtitle: function(){
        var milestoneSubtitle = "(Any milestones)";
        var milestones = Ext.Array.map(Ext.Object.getValues(this.milestoneData), function(m){
            var milestoneText = Ext.String.format("{0}: <b>{1}</b>", m.FormattedID, m.Name);
            if (m.TargetDate){
                milestoneText += " (" + Rally.util.DateTime.format(m.TargetDate, 'd-m-Y') + ")";
            }
            return milestoneText;
        });
        if (milestones && milestones.length > 0){
            milestoneSubtitle = milestones.join(', ');
        }
        this.logger.log('getMilestoneSubtitle', milestoneSubtitle);
        return milestoneSubtitle;
    }
});
