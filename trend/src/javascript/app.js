Ext.define("RallyTechServices.filtereddefectapps.FilteredDefectTrendApp", {
    extend: 'RallyTechServices.filtereddefectapps.AppBase',

    integrationHeaders : {
        name : "RallyTechServices.filtereddefectapps.BurndownApp"
    },

    launch: function(){
        this.callParent(arguments);
        this.on('filtersupdated', this.updateView, this);

    },
    getStartDate: function(){
        return Rally.util.DateTime.add(new Date(), 'day', -this.getSetting('dateRange'));
    },
    updateView: function(){
        this.logger.log('updateView', this.getFilterFindConfig());

        this.getDisplayBox().removeAll();
        this.getDisplayBox().add({
            xtype: 'rallychart',
            chartColors: ['#222','#6ab17d','#B81B10'],
            listeners: {
                snapshotsAggregated: this.updateChartData,
                scope: this
            },
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: {
                find: this.getFilterFindConfig(),
                fetch: ['State',"CreationDate"],
                hydrate: ['State'],
                limit: Infinity,
                removeUnauthorizedSnapshots: true
            },
            calculatorType: 'RallyTechServices.filtereddefectapps.DefectTrendCalculator',
            calculatorConfig: {
                activeDefectStates: this.getActiveDefectStates(),
                closedDefectStates: this.getClosedDefectStates(),
                startDate: this.getStartDate()
            },
            chartConfig: {
                chart: {
                    type: 'xy'
                },
                title: {
                    text: 'Defect Trend',
                    style: {
                        color: '#666',
                        fontSize: '18px',
                        fontFamily: 'ProximaNova',
                        fill: '#666'
                    }
                },
                subtitle: {
                    text: this.getMilestoneSubtitle(),
                    style: {
                        color: '#666',
                        fontSize: '14px',
                        fontFamily: 'ProximaNova',
                        fill: '#666'
                    }
                },
                xAxis: {
                    tickmarkPlacement: 'on',
                    tickInterval: 5,
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
                        min: 0,
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
    updateChartData: function(chart){
        var chartData = chart.getChartData();
        console.log('chartDate', chartData);
    },
    getClosedDefectStates: function(){
        return Ext.Array.difference(this.defectStates, this.getActiveDefectStates());
    },
    getSettingsFields: function(){
        var fields = this.callParent(arguments);
        var labelWidth = 200;
        fields.push({
                name: "dateRange",
                xtype: 'rallynumberfield',
                fieldLabel: 'Date Range',
                labelAlign: 'right',
                labelWidth: labelWidth,
                minValue: 0,
                afterBodyEl: ' days'
        });
        return fields;
    }
});
