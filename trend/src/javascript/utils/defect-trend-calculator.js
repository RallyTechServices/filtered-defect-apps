Ext.define('RallyTechServices.filtereddefectapps.DefectTrendCalculator',{
    extend: "Rally.data.lookback.calculator.TimeSeriesCalculator",

    getMetrics: function () {
        var activeStates = this.activeDefectStates,
            closedStates = this.closedDefectStates;
        console.log('activestates', activeStates);

        return [{
            field: "State",
            as: "Total Activated",
            "f": "filteredCount",
            "filterField": "State",
            "filterValues": activeStates,
            "display": "line",
            "marker": {
                enabled: false
            }
        },{
            field: "State",
            "as": "totalClosedDefects",
            "f": "filteredCount",
            "filterField": "State",
            "filterValues": closedStates
        },{
            field: "State",
            "as": "totalDefects",
            "f":"count"
        }];
    },
    //getDerivedFieldsOnInput: function(){
    //    var closedStates = this.closedDefectStates;
    //
    //    return [{
    //        "as": "closedDefect",
    //        "f": function(snapshot){
    //            if (Ext.Array.contains(closedStates, snapshot.State)){
    //                return 1;
    //            }
    //            return 0;
    //        }
    //    },{
    //        "as": "defect",
    //        "f": function(snapshot){
    //            return 1;
    //        }
    //    }];
    //},
    //getSummaryMetricsConfig: function () {
    //    return [{ "field": "closedDefect", "f": "sum" },
    //            { "field": "defect", "f": "sum" }];
    //},

    getDerivedFieldsAfterSummary: function(){
        return [{
                  "as": "Closed Defects",
                  "f": function(snapshot, index, metrics, seriesData) {
                      if (index === 0){
                          return 0;
                      } else {
                          var delta = Math.max(snapshot.totalClosedDefects - seriesData[index-1].totalClosedDefects, 0);
                          return seriesData[index-1]["Closed Defects"] + delta;
                      }
                  },
                  "display": "line"
              },{
                'as': 'Activated',
                "f": function(snapshot, index, metrics, seriesData) {
                    if (index === 0){
                        return 0;
                    } else {
                        var delta = snapshot.totalDefects - seriesData[index-1].totalDefects;
                        return seriesData[index-1]["Activated"] + delta;
                    }
                },
                "display": "line"
        }];
    },
    _buildSeriesConfig: function (calculatorConfig) {
        var aggregationConfig = [],
            metrics = calculatorConfig.metrics,
            derivedFieldsAfterSummary = calculatorConfig.deriveFieldsAfterSummary;

        for (var i = 0, ilength = metrics.length; i < ilength; i += 1) {
            var metric = metrics[i];
            if (metric.display) { //override so that it doesn't show metrics we don't want to
                var metricData = {
                    name: metric.as || metric.field,
                    type: metric.display,
                    dashStyle: metric.dashStyle || "Solid"
                };
                if (metric.marker){
                    metricData.marker = metric.marker;
                }
                aggregationConfig.push(metricData);
            }
        }

        for (var j = 0, jlength = derivedFieldsAfterSummary.length; j < jlength; j += 1) {
            var derivedField = derivedFieldsAfterSummary[j];
            aggregationConfig.push({
                name: derivedField.as,
                type: derivedField.display,
                dashStyle: derivedField.dashStyle || "Solid"
            });
        }
        console.log('aggregationConfig', aggregationConfig);
        return aggregationConfig;
    },

});
