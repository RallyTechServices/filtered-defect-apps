Ext.define('RallyTechServices.filtereddefectapps.common.Settings',{
    singleton: true,

    getFields: function(settings, states){

        var includeStates = settings && settings.includeStates || [];
        if (Ext.isString(includeStates)){
            includeStates = includeStates.split(',');
        }

        var labelWidth = 200,
            stateOptions = _.map(states, function(s){
                var checked = Ext.Array.contains(includeStates, s);
                return { boxLabel: s, name: 'includeStates', inputValue: s, checked: checked };
            });

        return [{
                xtype: 'checkboxgroup',
                fieldLabel: 'Active States',
                labelAlign: 'right',
                labelWidth: labelWidth,
                columns: 1,
                width: 700,
                margin: '0 0 25 0',
                vertical: true,
                items: stateOptions
            }, {
                name: "dateRange",
                xtype: 'rallynumberfield',
                fieldLabel: 'Date Range',
                labelAlign: 'right',
                labelWidth: labelWidth,
                minValue: 0,
                afterBodyEl: ' days'
            }];
    }
});
