(function () {
    let writes = [];

    J$.analysis = {

        write: function (iid, name, val, oldValue) {
            var id = J$.getGlobalIID(iid);
            writes.push({ name: name, value: val });
        },

        /**
         * This callback is called when an execution terminates in node.js.  In a browser
         * environment, the callback is called if ChainedAnalyses.js or ChainedAnalysesNoCheck.js
         * is used and Alt-Shift-T is pressed.
         *
         * @returns {undefined} - Any return value is ignored
         */
        endExecution: function () {
            for (let id in writes) {
                var writeInfo = writes[id];
                var location = J$.iidToLocation(id);
                console.log("Write value " + writeInfo.value +
                    " to variable " + writeInfo.name + ".");
            }
            //console.log(J$.smemory) // shadow memory
        }
    };

}());

