sap.ui.define([], function () {
    "use strict";

    // ── Private mock data ────────────────────────────────────────────────────
    // These arrays will be replaced by OData V4 entity-set reads when the RAP
    // back-end is available. The public interface (Promise-based methods below)
    // stays identical — only this section changes.

    var _aCodes = [
        { companyCode: "M111", name: "Madiba Holdings (Pty) Ltd",   country: "ZA" },
        { companyCode: "M040", name: "Madiba Africa Ltd",            country: "KE" },
        { companyCode: "M042", name: "Madiba East Africa (T) Ltd",   country: "TZ" },
        { companyCode: "M150", name: "Madiba West Ltd",              country: "NG" },
        { companyCode: "M177", name: "Madiba North Ltd",             country: "GH" },
        { companyCode: "M337", name: "Madiba Southern Ltd",          country: "ZW" },
        { companyCode: "M488", name: "Madiba Investments Ltd",       country: "MW" },
        { companyCode: "M790", name: "Madiba Services Ltd",          country: "MU" }
    ];

    // T001U intercompany relationships — VBUKR=initiator, ABUKR=recipient
    // Full bilateral mesh: every entity pair has a clearing account in both directions.
    var _aRelationships = [
        // M111 (ZA) ↔ all subsidiaries
        { vbukr: "M111", abukr: "M040", konts: "ICM04000", bschs: "01", name: "Madiba Africa Ltd" },
        { vbukr: "M111", abukr: "M042", konts: "ICM04200", bschs: "01", name: "Madiba East Africa (T) Ltd" },
        { vbukr: "M111", abukr: "M150", konts: "ICM15000", bschs: "01", name: "Madiba West Ltd" },
        { vbukr: "M111", abukr: "M177", konts: "ICM17700", bschs: "01", name: "Madiba North Ltd" },
        { vbukr: "M111", abukr: "M337", konts: "ICM33700", bschs: "01", name: "Madiba Southern Ltd" },
        { vbukr: "M111", abukr: "M488", konts: "ICM48800", bschs: "01", name: "Madiba Investments Ltd" },
        { vbukr: "M111", abukr: "M790", konts: "ICM79000", bschs: "01", name: "Madiba Services Ltd" },
        { vbukr: "M040", abukr: "M111", konts: "ICM11100", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "M042", abukr: "M111", konts: "ICM11100", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "M150", abukr: "M111", konts: "ICM11100", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "M177", abukr: "M111", konts: "ICM11100", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "M337", abukr: "M111", konts: "ICM11100", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "M488", abukr: "M111", konts: "ICM11100", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "M790", abukr: "M111", konts: "ICM11100", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },

        // M040 (KE) ↔ other subsidiaries
        { vbukr: "M040", abukr: "M042", konts: "IC040042", bschs: "01", name: "Madiba East Africa (T) Ltd" },
        { vbukr: "M040", abukr: "M150", konts: "IC040150", bschs: "01", name: "Madiba West Ltd" },
        { vbukr: "M040", abukr: "M177", konts: "IC040177", bschs: "01", name: "Madiba North Ltd" },
        { vbukr: "M040", abukr: "M337", konts: "IC040337", bschs: "01", name: "Madiba Southern Ltd" },
        { vbukr: "M040", abukr: "M488", konts: "IC040488", bschs: "01", name: "Madiba Investments Ltd" },
        { vbukr: "M040", abukr: "M790", konts: "IC040790", bschs: "01", name: "Madiba Services Ltd" },
        { vbukr: "M042", abukr: "M040", konts: "IC042040", bschs: "01", name: "Madiba Africa Ltd" },
        { vbukr: "M150", abukr: "M040", konts: "IC150040", bschs: "01", name: "Madiba Africa Ltd" },
        { vbukr: "M177", abukr: "M040", konts: "IC177040", bschs: "01", name: "Madiba Africa Ltd" },
        { vbukr: "M337", abukr: "M040", konts: "IC337040", bschs: "01", name: "Madiba Africa Ltd" },
        { vbukr: "M488", abukr: "M040", konts: "IC488040", bschs: "01", name: "Madiba Africa Ltd" },
        { vbukr: "M790", abukr: "M040", konts: "IC790040", bschs: "01", name: "Madiba Africa Ltd" },

        // M042 (TZ) ↔ other subsidiaries
        { vbukr: "M042", abukr: "M150", konts: "IC042150", bschs: "01", name: "Madiba West Ltd" },
        { vbukr: "M042", abukr: "M177", konts: "IC042177", bschs: "01", name: "Madiba North Ltd" },
        { vbukr: "M042", abukr: "M337", konts: "IC042337", bschs: "01", name: "Madiba Southern Ltd" },
        { vbukr: "M042", abukr: "M488", konts: "IC042488", bschs: "01", name: "Madiba Investments Ltd" },
        { vbukr: "M042", abukr: "M790", konts: "IC042790", bschs: "01", name: "Madiba Services Ltd" },
        { vbukr: "M150", abukr: "M042", konts: "IC150042", bschs: "01", name: "Madiba East Africa (T) Ltd" },
        { vbukr: "M177", abukr: "M042", konts: "IC177042", bschs: "01", name: "Madiba East Africa (T) Ltd" },
        { vbukr: "M337", abukr: "M042", konts: "IC337042", bschs: "01", name: "Madiba East Africa (T) Ltd" },
        { vbukr: "M488", abukr: "M042", konts: "IC488042", bschs: "01", name: "Madiba East Africa (T) Ltd" },
        { vbukr: "M790", abukr: "M042", konts: "IC790042", bschs: "01", name: "Madiba East Africa (T) Ltd" },

        // M150 (NG) ↔ other subsidiaries
        { vbukr: "M150", abukr: "M177", konts: "IC150177", bschs: "01", name: "Madiba North Ltd" },
        { vbukr: "M150", abukr: "M337", konts: "IC150337", bschs: "01", name: "Madiba Southern Ltd" },
        { vbukr: "M150", abukr: "M488", konts: "IC150488", bschs: "01", name: "Madiba Investments Ltd" },
        { vbukr: "M150", abukr: "M790", konts: "IC150790", bschs: "01", name: "Madiba Services Ltd" },
        { vbukr: "M177", abukr: "M150", konts: "IC177150", bschs: "01", name: "Madiba West Ltd" },
        { vbukr: "M337", abukr: "M150", konts: "IC337150", bschs: "01", name: "Madiba West Ltd" },
        { vbukr: "M488", abukr: "M150", konts: "IC488150", bschs: "01", name: "Madiba West Ltd" },
        { vbukr: "M790", abukr: "M150", konts: "IC790150", bschs: "01", name: "Madiba West Ltd" },

        // M177 (GH) ↔ other subsidiaries
        { vbukr: "M177", abukr: "M337", konts: "IC177337", bschs: "01", name: "Madiba Southern Ltd" },
        { vbukr: "M177", abukr: "M488", konts: "IC177488", bschs: "01", name: "Madiba Investments Ltd" },
        { vbukr: "M177", abukr: "M790", konts: "IC177790", bschs: "01", name: "Madiba Services Ltd" },
        { vbukr: "M337", abukr: "M177", konts: "IC337177", bschs: "01", name: "Madiba North Ltd" },
        { vbukr: "M488", abukr: "M177", konts: "IC488177", bschs: "01", name: "Madiba North Ltd" },
        { vbukr: "M790", abukr: "M177", konts: "IC790177", bschs: "01", name: "Madiba North Ltd" },

        // M337 (ZW) ↔ other subsidiaries
        { vbukr: "M337", abukr: "M488", konts: "IC337488", bschs: "01", name: "Madiba Investments Ltd" },
        { vbukr: "M337", abukr: "M790", konts: "IC337790", bschs: "01", name: "Madiba Services Ltd" },
        { vbukr: "M488", abukr: "M337", konts: "IC488337", bschs: "01", name: "Madiba Southern Ltd" },
        { vbukr: "M790", abukr: "M337", konts: "IC790337", bschs: "01", name: "Madiba Southern Ltd" },

        // M488 (MW) ↔ M790 (MU)
        { vbukr: "M488", abukr: "M790", konts: "IC488790", bschs: "01", name: "Madiba Services Ltd" },
        { vbukr: "M790", abukr: "M488", konts: "IC790488", bschs: "01", name: "Madiba Investments Ltd" }
    ];

    var _aTaxCodes = [
        { code: "",    description: "No Tax",              rate: 0    },
        { code: "A0",  description: "Output Tax Exempt",   rate: 0    },
        { code: "S0",  description: "Input Tax Exempt",    rate: 0    },
        { code: "V1",  description: "Output Tax 15%",      rate: 0.15 },
        { code: "V2",  description: "Output Tax 20%",      rate: 0.20 },
        { code: "V5",  description: "Output Tax 5%",       rate: 0.05 },
        { code: "VE",  description: "Tax Exempt (EU)",     rate: 0    }
    ];

    var _aClosedPeriods = ["01/2024", "02/2024"]; // simulated closed FI periods

    // ── Helper ───────────────────────────────────────────────────────────────

    function _ccName(sCC) {
        var oCode = _aCodes.find(function (c) { return c.companyCode === sCC; });
        return oCode ? oCode.name : sCC;
    }

    // ── Public service interface ─────────────────────────────────────────────
    // Every method returns a Promise. When OData is wired, replace
    // Promise.resolve(...) with ODataModel.bindList(...).requestContexts().
    // Controller call-sites use .then() and remain unchanged.

    return {

        /**
         * Returns all known company codes.
         * OData future: GET /CompanyCodes
         *
         * @returns {Promise<Array<{companyCode: string, name: string, country: string}>>}
         */
        getCompanyCodes: function () {
            return Promise.resolve(_aCodes.slice());
        },

        /**
         * Returns intercompany business partners for the specific initiator/recipient CC pair,
         * filtered by transaction type (AR/AP/Accrual determines the posting key schema).
         * OData future: GET /IntercoRelationships?$filter=InitiatorCC eq '{sInitiatorCC}'
         *               and RecipientCC eq '{sRecipientCC}'
         *
         * @param {string} sInitiatorCC  Initiator company code
         * @param {string} sRecipientCC  Recipient company code
         * @param {string} sTxType       "AR" | "AP" | "Accrual"
         * @returns {Promise<Array<{bp: string, bpName: string, cc: string, ccName: string}>>}
         */
        getBusinessPartners: function (sInitiatorCC, sRecipientCC, sTxType) {
            var sBschs = sTxType === "AP" ? "31" : "01";
            var aRows = _aRelationships
                .filter(function (r) {
                    return r.vbukr === sInitiatorCC &&
                           r.abukr === sRecipientCC &&
                           (sTxType === "Accrual" || r.bschs === sBschs);
                })
                .map(function (r) {
                    return {
                        bp:     r.konts,
                        bpName: r.name,
                        cc:     r.abukr,
                        ccName: _ccName(r.abukr)
                    };
                });
            return Promise.resolve(aRows);
        },

        /**
         * Returns the single reverse intercompany relationship (recipient-as-initiator),
         * used to derive the initiator's BP (clearing account) after F4 selection.
         * OData future: GET /IntercoRelationships?$filter=InitiatorCC eq '{sRecipientCC}'
         *               and RecipientCC eq '{sInitiatorCC}'&$top=1
         *
         * @param {string} sRecipientCC  The selected recipient company code
         * @param {string} sInitiatorCC  The current initiator company code
         * @returns {Promise<{konts: string, name: string} | null>}
         */
        getReverseBP: function (sRecipientCC, sInitiatorCC) {
            var oMatch = _aRelationships.find(function (r) {
                return r.vbukr === sRecipientCC && r.abukr === sInitiatorCC;
            });
            return Promise.resolve(oMatch || null);
        },

        /**
         * Returns all tax codes with their rates.
         * OData future: GET /TaxCodes
         *
         * @returns {Promise<Array<{code: string, description: string, rate: number}>>}
         */
        getTaxCodes: function () {
            return Promise.resolve(_aTaxCodes.slice());
        },

        /**
         * Returns the list of closed FI period keys (format: "MM/YYYY").
         * OData future: GET /FiscalPeriods?$filter=IsClosed eq true&$select=PeriodKey
         *
         * @returns {Promise<string[]>}
         */
        getClosedPeriods: function () {
            return Promise.resolve(_aClosedPeriods.slice());
        },

        /**
         * Fetches intercompany document types from the custom S/4HANA CBO.
         * Locally: proxied by ui5-middleware-simpleproxy (see ui5.yaml).
         * In BTP production: the destination handles the host and auth.
         * OData: GET YY1_ICDOCTYPE_CDS/YY1_ICDOCTYPE?$select=DocumentType
         *
         * @returns {Promise<Array<{documentType: string}>>}
         */
        getDocumentTypes: function () {
            var sUrl = "/sap/opu/odata/sap/YY1_ICDOCTYPE_CDS/YY1_ICDOCTYPE" +
                       "?$format=json&$select=DocumentType";

            return new Promise(function (resolve) {
                jQuery.ajax({
                    url: sUrl,
                    method: "GET",
                    success: function (oData) {
                        var aResults = (oData && oData.d && oData.d.results) || [];
                        resolve(aResults.map(function (o) {
                            return { documentType: o.DocumentType };
                        }));
                    },
                    error: function () {
                        resolve([]);
                    }
                });
            });
        }

    };
});
