Ext.define("RallyTechServices.filtereddefectapps.DefectHHistoryMatrix", {
    extend: 'RallyTechServices.filtereddefectapps.AppBase',

    integrationHeaders : {
        name : "RallyTechServices.filtereddefectapps.DefectHHistoryMatrix"
    },

    noneText: "-- None --",

    /**
     * User can pick any dropdown field (custom and builtin) that do not
     * need to be hydrated.
     *
     * Additional fields that can be used as bucket fields will be noted in the
     * bucketFieldWhitelist below
     */
    bucketFieldWhitelist: [
        'Project',
        'Owner',
        'SubmittedBy',
        'ScheduleState',
        'State',
        'Priority',
        'Severity',
        'Environment'
    ],
    bucketFieldAttributeTypeWhitelist: [
        'STRING'
    ],
    detailFetchFields: ["FormattedID","Name","State","Priority","Milestones","Tags"],
    config: {
        defaultSettings: {
            artifactType: 'Defect',
            historicalDays: 4,
            bucketField: 'SubmittedBy'
        }
    },
    launch: function() {
        this.callParent(arguments);
        Rally.dependencies.Analytics.load(function() {
            // this._loadChart must be called asynchronously in both rui and app sdk
            // in order for client metrics event parenting to happen correctly
            Ext.Function.defer(this.updateView(), 1, this);
        }, this);
        this.on('filtersupdated', this.updateView, this);
    },
    updateView: function(){

        this.getDisplayBox().removeAll();
        this.fetchData();
    },
    getFilterFindConfig: function(){
        var milestones = this.getMilestones(),
            tags = this.down('rallytagpicker') && this.down('rallytagpicker').getValue(),
            states = this.getActiveDefectStates(),
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
        this.logger.log('getFilterFindConfig config', findConfig);
        return findConfig;
    },

    processData: function(store){
        this.setLoading(false);
        var calc = Ext.create('CA.agile.technicalservices.HistoryMatrixCalculator',{
            startDate: Rally.util.DateTime.fromIsoString(this.getIsoStartDate()),
            endDate: new Date(),
            bucketField: this.getBucketField(),
            noneText: this.noneText
        });
        var data = calc.prepareChartData(store);

        this.logger.log('processData', data);

        if (CA.agile.technicalservices.HydrationHelper.needsManualHydration(this.getBucketField())){
            this.setLoading("Hydrating...");
            this.fetchMetaData(calc.buckets).then({
                success: function(bucketValueMap){
                    this.buildGrid(data, bucketValueMap);
                },
                failure: function(msg){
                    this.showErrorNotification(msg);
                    this.buildGrid(data);
                },
                scope: this
            }).always(function(){ this.setLoading(false);}, this);
        } else {
            this.buildGrid(data);
        }
    },
    buildGrid: function(data, bucketValueMap){

        var bucketField = this.getBucketField(),
            fields = [bucketField].concat(data.categories);

        this.logger.log('buildGrid', data, fields, bucketField);
        var storeData = [];
        for (var j = 0; j < data.series.length; j++){
            var s = data.series[j];
            var row = {};
            row[bucketField] = s.name;
            if (bucketValueMap && (bucketValueMap[s.name] || bucketValueMap[s.name.toString()])){
                row[bucketField] = (bucketValueMap[s.name] || bucketValueMap[s.name.toString()]);
            }

            for (var i = 0; i < data.categories.length; i++){
                row[data.categories[i]] = s.data[i];
            }
            storeData.push(row);
        };

        this.logger.log('buildGrid storeData', storeData);
        var store = Ext.create('Rally.data.custom.Store',{
            fields: fields,
            data: storeData,
            pageSize: storeData.length
        });

        this.getDisplayBox().removeAll();
        var grid = this.getDisplayBox().add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: this.getColumnCfgs(data.categories),
            showRowActionsColumn: false,
            showPagingToolbar: false
        });
        grid.on('itemdblclick', this.showCurrentArtifacts, this);
    },
    showCurrentArtifacts: function(grid, record){
        var milestones = this.down('rallymilestonepicker').getValue(),
            tags = this.down('rallytagpicker').getValue(),
            states = this.down('#statePicker').getValue(),
            priorities = this.down('#priorityPicker').getValue();

        this.logger.log('showCurrentArtifacts', record, milestones, tags, states, priorities);

        var bucketFieldValue = record.get(this.getBucketField());
        //deal with blank values in the bucket field
        bucketFieldValue = bucketFieldValue.replace(this.noneText, '');

        //We need to get the right property to query with
        var bucketFieldProperty = CA.agile.technicalservices.HydrationHelper.getActualBucketFieldProperty(this.getBucketField());
        if (bucketFieldValue === ''){
            bucketFieldProperty = this.getBucketField();
        }

        var filters = Ext.create('Rally.data.wsapi.Filter',{
            property: bucketFieldProperty,
            value: bucketFieldValue
        });

        if (states && states.length > 0){
            var tempFilters = this.getTempFilters('State',states);
            filters = filters.and(tempFilters);
        }
        this.logger.log('showCurrentArtifacts filters with states', filters.toString());

        if (priorities && priorities.length > 0){
            var tempFilters = this.getTempFilters('Priority',priorities);
            filters = filters.and(tempFilters);
        }
        this.logger.log('showCurrentArtifacts filters with priorities', filters.toString());

        if (milestones && milestones.length > 0){
            var tempFilters = this.getTempFilters('Milestones.ObjectID',milestones);
            filters = filters.and(tempFilters);
        }
        this.logger.log('showCurrentArtifacts filters with milestones', filters.toString());

        if (tags && tags.length > 0){
            var tempFilters = this.getTempFilters('Tags.ObjectID',tags);
            filters = filters.and(tempFilters);
        }
        this.logger.log('showCurrentArtifacts filters with tags', filters.toString());

        Ext.create('CA.agile.technicalservices.DetailPopover',{
            context: this.getContext(),
            autoShow: true,
            title: "Defects for " + this.getBucketField() + " [" + record.get(this.getBucketField()) + "]",
            titleIconHtml: '<div class="icon-defect"></div>',
            modelNames: [this.getArtifactType()],
            target: grid.getEl(),
            height: this.getHeight() *.95,
            gridConfig: {
                storeConfig: {
                    filters: filters,
                    fetch: this.detailFetchFields,
                    context: {project: null}
                },
                columnCfgs: this.detailFetchFields
            }
        });

    },
    getTempFilters: function(field, values){
        var tempFilters = Ext.Array.map(values, function(v){
            if (v === "None"){ v = ""; }
            return {
                property: field,
                value: v
            };
        });
        if (tempFilters.length > 1){
            tempFilters = Rally.data.wsapi.Filter.or(tempFilters);
        } else {
            return Ext.create('Rally.data.wsapi.Filter', tempFilters[0]);
        }
        return tempFilters;
    },
    getColumnCfgs: function(buckets){
        var cols = [{
            dataIndex: this.getBucketField(),
            text: this.getBucketField(),
            flex: 1
        }];

        Ext.Array.each(buckets, function(b){
            cols.push({
                dataIndex: b,
                text: b
            });
        });
        return cols;
    },
    /**
     * fetchMetaData
     * @param store
     *
     * if the bucket field needs to be manually hydrated, then we will do that here.
     * Otherwise, we'll just call ProcessData directly
     */
    fetchMetaData: function(buckets){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('fetchMetaData', buckets);
        var filters = [];
        Ext.Array.each(buckets, function(b){
            if (!isNaN(b)){
                filters.push({
                    property: 'ObjectID',
                    value: b
                });
            }
        });

        if(filters.length > 1){
            filters = Rally.data.wsapi.Filter.or(filters);
        }
        this.logger.log('filters', filters, filters.toString());

        Ext.create('Rally.data.wsapi.Store',{
            model: CA.agile.technicalservices.HydrationHelper.getFieldModelType(this.getBucketField()),
            fetch: CA.agile.technicalservices.HydrationHelper.getFieldFetchList(this.getBucketField()),
            filters: filters,
            enablePostGet: true,
            limit: buckets.length,
            context: {project: null},
            pageSize: Math.min(2000, buckets.length)
        }).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    var map = _.reduce(records, function(obj, rec){
                        obj[rec.get('ObjectID')] = rec.get('_refObjectName');
                        return obj;
                    }, {});

                    deferred.resolve(map);
                } else {
                    deferred.reject('Error loading meta data.  Object IDs will be displayed instead:  ' + operation.error.errors.join(','));
                }
            }
        });
        return deferred.promise;
    },
    getObjectIDList: function(records){
        return Ext.Array.map(records, function(r){
            return r.get('ObjectID');
        });
    },
    fetchData: function(){

        var config = this.getFilterFindConfig();

        config._ValidTo = {$gte: this.getIsoStartDate()};

        this.logger.log('fetchData', config, this.getBucketField());

        this.setLoading(true);
        var store = Ext.create('Rally.data.lookback.SnapshotStore',{
            findConfig: config,
            fetch: [this.getBucketField(), '_ValidFrom','_ValidTo'],
            limit: Infinity,
            removeUnauthorizedSnapshots: true,
            hydrate: CA.agile.technicalservices.HydrationHelper.getHydrateConfig(this.getBucketField())
        });

        store.on('load', this.processData, this);
        store.load();
    },

    getIsoStartDate: function(){
        var currentDate = new Date();
        currentDate.setHours(0);
        currentDate.setMinutes(0);
        currentDate.setSeconds(0);
        var date = Rally.util.DateTime.add(currentDate, 'day', this.getDaysBack() - 1);
        this.logger.log('getIsoStartDate', date);
        return Rally.util.DateTime.toIsoString(date);
    },
    getDaysBack: function(){
        var setting = this.getSetting('historicalDays') || 5;
        return -setting;
    },
    getBucketField: function(){
        return this.getSetting('bucketField') || 'Project';
    },
    getArtifactType: function(){
        return this.getSetting('artifactType') || 'Defect';
    },
    getDisplayBox: function(){
        return this.down('#display_box');
    },
    getSelectorBox: function(){
        return this.down('#selector_box');
    },
    getSettingsFields: function(){
        var attributeTypeWhitelist = this.bucketFieldAttributeTypeWhitelist,
            fieldWhitelist = this.bucketFieldWhitelist;

        var labelWidth = 200;

        var fields = this.callParent(arguments);

       fields.push({
            xtype: 'rallynumberfield',
            name: 'historicalDays',
            minValue: 0,
            maxValue: 25,
            fieldLabel: '# Historical Days',
            labelAlign: 'right',
            labelWidth: labelWidth
        });

        fields.push({
            xtype: 'rallyfieldcombobox',
            name: 'bucketField',
            model: this.getArtifactType(),
            fieldLabel: 'Bucket Field',
            labelAlign: 'right',
            labelWidth: labelWidth,
            _isNotHidden: function(field) {
                if (!field.readOnly && !field.hidden && field.attributeDefinition){
                    var show = Ext.Array.contains(fieldWhitelist, field.name);
                    if (!show){
                        show = Ext.Array.contains(attributeTypeWhitelist, field.attributeDefinition.AttributeType);
                    }
                    return show;
                }
                return false;
            }
        });
        return fields;
    }
});
