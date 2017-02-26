Ext.define('RallyTechServices.filtereddefectapps.DefectBurndownCalculator',{
    extend: "Rally.data.lookback.calculator.TimeSeriesCalculator",

    getMetrics: function () {
        return [
            {
                "field": "State",
                "as": "Active Defects",
                "f": "filteredCount",
                "filterField": "State",
                "filterValues": this.activeDefectStates,
                "display": "column"
            }
        ];
    },
    getDerivedFieldsAfterSummary: function(){
        return [{
            "as": "Ideal",
            "f": function(snapshot, index, metrics, seriesData) {
                var max = seriesData[0]["Active Defects"],
                    increments = seriesData.length - 1,
                    incrementAmount = max / increments;

                return Math.floor(100 * (max - index * incrementAmount)) / 100;
            },
            "display": "line"
        }];
    }
});
