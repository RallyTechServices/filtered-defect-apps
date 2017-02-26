Ext.define("RallyTechServices.filtereddefectapps.BurndownApp", {
    extend: 'RallyTechServices.filtereddefectapps.AppBase',

    integrationHeaders : {
        name : "RallyTechServices.filtereddefectapps.BurndownApp"
    },

    launch: function(){
        this.callParent(arguments);
        this.on('filtersupdated', this.updateView, this);

    },
    updateView: function(){

        var find = this.getFilterFindConfig();
        this.logger.log('updateView', find, this.getStartDate(), this.getEndDate());
        this.logger.log('updateview', this.getActiveDefectStates());

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


        this.getDisplayBox().removeAll();

        var tickInterval = 5;

        this.getDisplayBox().add({
            xtype: 'rallychart',
            chartColors: ["#7CAFD7","#6ab17d"],
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: {
                find: find,
                fetch: ['State'],
                hydrate: ['State'],
                limit: Infinity,
                removeUnauthorizedSnapshots: true
            },
            calculatorType: 'RallyTechServices.filtereddefectapps.DefectBurndownCalculator',
            calculatorConfig: {
                activeDefectStates: this.getActiveDefectStates(),
                startDate: this.getStartDate(),
                endDate: this.getEndDate()
            },
            chartConfig: {
                chart: {
                    type: 'column'
                },
                title: {
                    text: 'Defect Burndown',
                    style: {
                        color: '#666',
                        fontSize: '18px',
                        fontFamily: 'ProximaNova',
                        textTransform: 'uppercase',
                        fill: '#666'
                    }
                },
                subtitle: {
                    text: milestoneSubtitle,
                    style: {
                        color: '#666',
                        fontSize: '14px',
                        fontFamily: 'ProximaNova',
                        fill: '#666'
                    }
                },
                xAxis: {
                    tickmarkPlacement: 'on',
                    tickInterval: tickInterval,
                    title: {
                        text: 'Days',
                        style: {
                            color: '#444',
                            fontFamily: 'ProximaNova',
                            textTransform: 'uppercase',
                            fill: '#444'
                        }
                    },
                    plotLines: this.getPlotlines()
                },
                yAxis: [
                    {
                        title: {
                            text: 'Count',
                            style: {
                                color: '#444',
                                fontFamily: 'ProximaNova',
                                textTransform: 'uppercase',
                                fill: '#444'
                            }
                        }
                    }
                ],

                legend: {
                    itemStyle: {
                        color: '#444',
                        fontFamily: 'ProximaNova',
                        textTransform: 'uppercase'
                    },
                    borderWidth: 0
                },
                tooltip: {
                    backgroundColor: '#444',
                    headerFormat: '<span style="display:block;margin:0;padding:0 0 2px 0;text-align:center"><b style="font-family:NotoSansBold;color:white;">{point.key}</b></span><table><tbody>',
                    footerFormat: '</tbody></table>',
                    pointFormat: '<tr><td class="tooltip-label"><span style="color:{series.color};width=100px;">\u25CF</span> {series.name}</td><td class="tooltip-point">{point.y}</td></tr>',
                    shared: true,
                    useHTML: true,
                    borderColor: '#444'
                }
            }

        });
    },

    getStartDate: function(){
        return (this.getSetting('startDate') && Rally.util.DateTime.fromIsoString(this.getSetting('startDate'))) || Rally.util.DateTime.add(this.getEndDate(), 'day', -30);
    },
    getEndDate: function(){
        return (this.getSetting('endDate') && Rally.util.DateTime.fromIsoString(this.getSetting('endDate'))) || new Date();
    },
    getSettingsFields: function(){
        var fields = this.callParent(arguments);
        var labelWidth = 200;
        fields.push({
            xtype: 'rallydatefield',
            fieldLabel: 'Start Date',
            labelAlign: 'right',
            labelWidth: labelWidth,
            name: 'startDate',
            allowBlank: false
        });

        fields.push({
            xtype: 'rallydatefield',
            fieldLabel: 'End Date',
            labelAlign: 'right',
            labelWidth: labelWidth,
            name: 'endDate',
            allowBlank: false
        });
        return fields;
    }
});
