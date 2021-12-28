(function () {

    J$.analysis = {

        write: function (iid, name, val, oldValue) {
            var sobj = J$.smemory.getShadowFrame(name);
            var frameId = J$.smemory.getIDFromShadowObjectOrFrame(sobj);
            var ret = "Store of frame(id=" + frameId + ")." + name;
            ret += " at " + J$.iidToLocation(J$.sid, iid);
            console.log(ret);
            return { result: val };
        },

        putFieldPre: function (iid, base, offset, isComputed, isOpAssign, isMethodCall) {
            var sobj = J$.smemory.getShadowObject(base, offset, true).owner;
            var actualObjectId = J$.smemory.getIDFromShadowObjectOrFrame(sobj);
            var ret = "Load of object(id=" + actualObjectId + ")." + offset;
            ret += " at " + J$.iidToLocation(J$.sid, iid);
            console.log(ret);
        },

        write: function (iid, name, val, lhs, isGlobal, isScriptLocal) {
            var sobj = J$.smemory.getShadowFrame(name);
            var frameId = J$.smemory.getIDFromShadowObjectOrFrame(sobj);
            var ret = "Store of frame(id=" + frameId + ")." + name;
            ret += " at " + J$.iidToLocation(J$.sid, iid);
            console.log(ret);
            return { result: val };
        },

        literal: function (iid, val, hasGetterSetter) {
            if (typeof val === "object" && val !== null) {
                const sobj = J$.smemory.getShadowObjectOfObject(val);
                sobj.allocSite = J$.iidToLocation(J$.sid, iid); // store metadata to the field 'allocSite'
            }
        },

        getFieldPre: function (iid, base, offset, isComputed, isOpAssign, isMethodCall) {

            // 1) Log associated allocation site
            var sobj = J$.smemory.getShadowObject(base, offset, true).owner;
            // var sobj = J$.smemory.getShadowObjectOfObject(base); // equivalent to above
            var ret = "Load '" + offset + "' of object allocated at " + sobj.allocSite;
            ret += " at " + J$.iidToLocation(J$.sid, iid);
            console.log(ret);

            // 2) Log all loads and saves
            var actualObjectId = J$.smemory.getIDFromShadowObjectOrFrame(sobj);
            var ret = "Load of object(id=" + actualObjectId + ")." + offset;
            ret += " at " + J$.iidToLocation(J$.sid, iid);
            console.log(ret);
        },

        /**
         * This callback is called when an execution terminates in node.js.  In a browser
         * environment, the callback is called if ChainedAnalyses.js or ChainedAnalysesNoCheck.js
         * is used and Alt-Shift-T is pressed.
         *
         * @returns {undefined} - Any return value is ignored
         */
        endExecution: function () {
            //console.log(J$.smemory) // shadow memory
            //console.log(J$.smemory.functionReturn)
        }
    };

}());

