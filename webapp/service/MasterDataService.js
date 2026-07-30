sap.ui.define([], function () {
    "use strict";

    // ── Private mock data ────────────────────────────────────────────────────
    // These arrays will be replaced by OData V4 entity-set reads when the RAP
    // back-end is available. The public interface (Promise-based methods below)
    // stays identical — only this section changes.

    // Company codes aligned with real SAP S/4HANA tenant (my406980).
    var _aCodes = [
        { companyCode: "1110", name: "Madiba Holdings (Pty) Ltd",   country: "US" },
        { companyCode: "1002", name: "Madiba Africa Ltd",            country: "GB" },
        { companyCode: "1006", name: "Madiba East Africa (T) Ltd",   country: "US" },
        { companyCode: "1150", name: "Madiba West Ltd",              country: "GB" },
        { companyCode: "1177", name: "Madiba North Ltd",             country: "US" },
        { companyCode: "1337", name: "Madiba Southern Ltd",          country: "GB" },
        { companyCode: "1488", name: "Madiba Investments Ltd",       country: "US" },
        { companyCode: "1790", name: "Madiba Services Ltd",          country: "GB" }
    ];

    // T001U intercompany relationships.
    // bp = SAP Customer number of the RECIPIENT entity in the INITIATOR's company books.
    //      This is what is passed as "Customer" in the I_CustomerCompany OData V4 filter.
    // konts = display label for the reverse / initiator BP field (informational only).
    //
    // Real customer numbers sourced from I_CustomerCompany API response:
    //   1110 / Customer 1000061 → ReconciliationAccount 12100000
    //   1110 / Customer 1        → ReconciliationAccount 12100000
    //   1002 / Customer 1000050 → ReconciliationAccount 121500
    //   1002 / Customer 1000000 → ReconciliationAccount 121500
    //   1006 / Customer 1000050 → ReconciliationAccount 12100000
    var _aRelationships = [
        // 1110 (ZA) → subsidiaries
        // bp    = Customer number of recipient in initiator's books (passed to I_CustomerCompany)
        // konts = Reconciliation account (KNBK-AKONT) — used as GL Account fallback when API is unavailable
        { vbukr: "1110", abukr: "1002", bp: "1000061", konts: "12100000", bschs: "01", name: "Madiba Africa Ltd" },
        { vbukr: "1110", abukr: "1006", bp: "1",       konts: "12100000", bschs: "01", name: "Madiba East Africa (T) Ltd" },
        { vbukr: "1110", abukr: "1150", bp: "1000062", konts: "12100000", bschs: "01", name: "Madiba West Ltd" },
        { vbukr: "1110", abukr: "1177", bp: "1000063", konts: "12100000", bschs: "01", name: "Madiba North Ltd" },
        { vbukr: "1110", abukr: "1337", bp: "1000064", konts: "12100000", bschs: "01", name: "Madiba Southern Ltd" },
        { vbukr: "1110", abukr: "1488", bp: "1000065", konts: "12100000", bschs: "01", name: "Madiba Investments Ltd" },
        { vbukr: "1110", abukr: "1790", bp: "1000066", konts: "12100000", bschs: "01", name: "Madiba Services Ltd" },

        // Subsidiaries → 1110
        { vbukr: "1002", abukr: "1110", bp: "1000000", konts: "121500",   bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "1006", abukr: "1110", bp: "1000050", konts: "12100000", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "1150", abukr: "1110", bp: "1000050", konts: "12100000", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "1177", abukr: "1110", bp: "1000050", konts: "12100000", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "1337", abukr: "1110", bp: "1000050", konts: "12100000", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "1488", abukr: "1110", bp: "1000050", konts: "12100000", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },
        { vbukr: "1790", abukr: "1110", bp: "1000050", konts: "12100000", bschs: "01", name: "Madiba Holdings (Pty) Ltd" },

        // Cross-subsidiary relationships
        { vbukr: "1002", abukr: "1006", bp: "1000050", konts: "121500",   bschs: "01", name: "Madiba East Africa (T) Ltd" },
        { vbukr: "1006", abukr: "1002", bp: "1000000", konts: "12100000", bschs: "01", name: "Madiba Africa Ltd" },
        { vbukr: "1002", abukr: "1150", bp: "1000070", konts: "121500",   bschs: "01", name: "Madiba West Ltd" },
        { vbukr: "1002", abukr: "1177", bp: "1000071", konts: "121500",   bschs: "01", name: "Madiba North Ltd" },
        { vbukr: "1002", abukr: "1337", bp: "1000072", konts: "121500",   bschs: "01", name: "Madiba Southern Ltd" },
        { vbukr: "1002", abukr: "1488", bp: "1000073", konts: "121500",   bschs: "01", name: "Madiba Investments Ltd" },
        { vbukr: "1002", abukr: "1790", bp: "1000074", konts: "121500",   bschs: "01", name: "Madiba Services Ltd" }
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
    var _aTaxCodesCache = null; // cache for ZC_RETRIEVE_TAXCODE full list

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
                        bp:     r.bp,
                        konts:  r.konts,
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

        getAllTaxCodes: function () {
            var USE_LIVE_API = true;
            if (!USE_LIVE_API) {
                return Promise.resolve(_aTaxCodes.slice());
            }
            if (_aTaxCodesCache) {
                return Promise.resolve(_aTaxCodesCache.slice());
            }
            return new Promise(function (resolve, reject) {
                var sRoot = "/sap/opu/odata4/sap/zsb_interco_app/srvd/sap/zsd_interco_app/0001/";
                jQuery.ajax({
                    url:    sRoot + "ZC_RETRIEVE_TAXCODE",
                    method: "GET",
                    headers: {
                        "Accept":           "application/json",
                        "OData-Version":    "4.0",
                        "OData-MaxVersion": "4.0"
                    },
                    success: function (oData) {
                        var aRaw = (oData && oData.value) || [];
                        if (aRaw.length > 0) {
                            console.log("[TaxCodes] Raw first record keys:", Object.keys(aRaw[0]), aRaw[0]);
                        }
                        _aTaxCodesCache = aRaw.map(function (item) {
                            return {
                                code:        item.TaxCode,
                                description: item.TaxCodeDescription,
                                country:     item.Country,
                                rate:        0
                            };
                        });
                        console.log("[TaxCodes] Loaded " + _aTaxCodesCache.length + " records from ZC_RETRIEVE_TAXCODE", _aTaxCodesCache);
                        resolve(_aTaxCodesCache.slice());
                    },
                    error: function (oXHR, sStatus, sError) {
                        console.error("[TaxCodes] ZC_RETRIEVE_TAXCODE failed:", oXHR.status, sError, oXHR.responseText);
                        reject(new Error(
                            "Failed to fetch tax codes [" + oXHR.status + " " + sError + "]"
                        ));
                    }
                });
            });
        },

        getTaxCodesByCountry: function (sCountry) {
            if (!sCountry) { return Promise.resolve([]); }
            return this.getAllTaxCodes().then(function (aAll) {
                return aAll.filter(function (t) { return t.country === sCountry; });
            });
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
         * Retrieves the FI Reconciliation Account (LFB1-AKONT) for the given
         * CompanyCode / Supplier pair from the SAP standard entity I_SupplierCompany.
         *
         * Used to populate the GL Account on the System BP Clearing Line (row 0 of
         * initiatorLines) in the Initiator GL Coding block.
         *
         * Called with:
         *   sCompanyCode = Recipient Company Code
         *   sSupplier    = Recipient Business Partner (Supplier number)
         *
         * Phase 1 (active): returns mock data so the controller chain works end-to-end
         *   without a live backend.
         * Phase 2 (live):   replace the mock block with the jQuery.ajax call below;
         *   the method signature and return contract are identical, so no controller
         *   changes are required.
         *
         * OData V4: GET /sap/opu/odata4/sap/zsb_interco_app/srvd/sap/zsd_interco_app/0001/
         *               I_SupplierCompany
         *               ?$filter=CompanyCode eq '{sCompanyCode}' and Supplier eq '{sSupplier}'
         *               &$select=ReconciliationAccount,Supplier
         *               &$top=1
         *
         * @param {string} sCompanyCode  Recipient company code
         * @param {string} sSupplier     Recipient Business Partner (Supplier number)
         * @returns {Promise<{reconciliationAccount: string, supplier: string} | null>}
         *          Resolves to null when no match is found; rejects on network error.
         */
        getReconciliationAccount: function (sCompanyCode, sSupplier) {
            // ── PHASE FLAG ────────────────────────────────────────────────────────
            // Set to true when the communication arrangement for zsb_interco_app
            // is active and USER_SAP_COM_BTP has authorization for I_SupplierCompany.
            var USE_LIVE_API = true;

            if (!USE_LIVE_API) {
                // Phase 1: mock — keyed by company code, returns AP reconciliation account.
                var _aMock = {
                    "1110": "21100000", "1002": "21100000", "1006": "21100000",
                    "1150": "21100000", "1177": "21100000", "1337": "21100000",
                    "1488": "21100000", "1790": "21100000"
                };
                return Promise.resolve({
                    reconciliationAccount: _aMock[sCompanyCode] || "21100000",
                    supplier: sSupplier
                });
            }

            // Phase 2: live OData V4 — activate by setting USE_LIVE_API = true above.
            var sServiceRoot = "/sap/opu/odata4/sap/zsb_interco_app/srvd/sap/zsd_interco_app/0001/";
            var sFilter      = "CompanyCode eq '" + sCompanyCode +
                               "' and Supplier eq '" + sSupplier + "'";
            var sUrl = sServiceRoot + "I_SupplierCompany" +
                       "?$filter=" + encodeURIComponent(sFilter) +
                       "&$select=ReconciliationAccount,Supplier" +
                       "&$top=1";

            return new Promise(function (resolve, reject) {
                jQuery.ajax({
                    url:    sUrl,
                    method: "GET",
                    headers: {
                        "Accept":           "application/json",
                        "OData-Version":    "4.0",
                        "OData-MaxVersion": "4.0"
                    },
                    success: function (oData) {
                        var aValue = (oData && oData.value) || [];
                        if (!aValue.length) {
                            resolve(null);
                            return;
                        }
                        resolve({
                            reconciliationAccount: aValue[0].ReconciliationAccount,
                            supplier:              aValue[0].Supplier
                        });
                    },
                    error: function (oXHR, sStatus, sError) {
                        reject(new Error(
                            "I_SupplierCompany request failed [" + oXHR.status + " " + sError + "]" +
                            " for CompanyCode=" + sCompanyCode + ", Supplier=" + sSupplier
                        ));
                    }
                });
            });
        },

        /**
         * Retrieves the FI Reconciliation Account (KNBK-AKONT) for the given
         * CompanyCode / Customer pair from the SAP standard entity I_CustomerCompany.
         *
         * Used to populate the GL Account on the System BP Clearing Line (row 0 of
         * recipientLines) in the Recipient GL Coding block.
         *
         * Called with:
         *   sCompanyCode = Initiator Company Code
         *   sCustomer    = Initiator Business Partner (Customer number in recipient's books)
         *
         * OData V4: GET /sap/opu/odata4/sap/zsb_interco_app/srvd/sap/zsd_interco_app/0001/
         *               I_CustomerCompany
         *               ?$filter=CompanyCode eq '{sCompanyCode}' and Customer eq '{sCustomer}'
         *               &$select=ReconciliationAccount,Customer
         *               &$top=1
         *
         * @param {string} sCompanyCode  Initiator company code
         * @param {string} sCustomer     Initiator Business Partner (Customer number)
         * @returns {Promise<{reconciliationAccount: string, customer: string} | null>}
         *          Resolves to null when no match is found; rejects on network error.
         */
        getReconciliationAccountCustomer: function (sCompanyCode, sCustomer) {
            var USE_LIVE_API = true;

            if (!USE_LIVE_API) {
                var _aMock = {
                    "1110": "12100000", "1002": "12100000", "1006": "12100000",
                    "1150": "12100000", "1177": "12100000", "1337": "12100000",
                    "1488": "12100000", "1790": "12100000"
                };
                return Promise.resolve({
                    reconciliationAccount: _aMock[sCompanyCode] || "12100000",
                    customer: sCustomer
                });
            }

            var sServiceRoot = "/sap/opu/odata4/sap/zsb_interco_app/srvd/sap/zsd_interco_app/0001/";
            var sFilter      = "CompanyCode eq '" + sCompanyCode +
                               "' and Customer eq '" + sCustomer + "'";
            var sUrl = sServiceRoot + "I_CustomerCompany" +
                       "?$filter=" + encodeURIComponent(sFilter) +
                       "&$select=ReconciliationAccount,Customer" +
                       "&$top=1";

            return new Promise(function (resolve, reject) {
                jQuery.ajax({
                    url:    sUrl,
                    method: "GET",
                    headers: {
                        "Accept":           "application/json",
                        "OData-Version":    "4.0",
                        "OData-MaxVersion": "4.0"
                    },
                    success: function (oData) {
                        var aValue = (oData && oData.value) || [];
                        if (!aValue.length) {
                            resolve(null);
                            return;
                        }
                        resolve({
                            reconciliationAccount: aValue[0].ReconciliationAccount,
                            customer:              aValue[0].Customer
                        });
                    },
                    error: function (oXHR, sStatus, sError) {
                        reject(new Error(
                            "I_CustomerCompany request failed [" + oXHR.status + " " + sError + "]" +
                            " for CompanyCode=" + sCompanyCode + ", Customer=" + sCustomer
                        ));
                    }
                });
            });
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
        },

        // ── Internal: fetch CSRF token required for mutating OData V4 requests ─
        _fetchCsrfToken: function (sRoot) {
            return new Promise(function (resolve, reject) {
                jQuery.ajax({
                    url:    sRoot + "ZC_INTERCO_JE_HEADER?$top=0",
                    method: "GET",
                    headers: { "X-CSRF-Token": "Fetch", "OData-Version": "4.0" },
                    complete: function (oXHR) {
                        var sType = oXHR.getResponseHeader("Content-Type") || "";
                        if (sType.indexOf("text/html") !== -1) {
                            reject(new Error(
                                "Authentication error: SAP returned an SSO redirect during CSRF fetch. " +
                                "Ensure ui5.yaml uses a communication user (USER_SAP_COM_BTP) with basic auth."
                            ));
                            return;
                        }
                        if (oXHR.status >= 400) {
                            var sDetail = oXHR.statusText;
                            try {
                                var oErrBody = JSON.parse(oXHR.responseText);
                                sDetail = (oErrBody.error && oErrBody.error.message) ? oErrBody.error.message : oXHR.responseText;
                            } catch (e) { /* non-JSON error body */ }
                            reject(new Error(
                                "Service access denied [" + oXHR.status + "]: " + sDetail +
                                " — Assign a Business Role containing the ZSB_INTERCO_APP catalog to USER_SAP_COM_BTP."
                            ));
                            return;
                        }
                        resolve(oXHR.getResponseHeader("X-CSRF-Token") || "");
                    }
                });
            });
        },

        /**
         * Posts an intercompany document to ZC_INTERCO_JE_HEADER / ZC_INTERCO_JE_ITEM.
         *
         * Flow (SAP RAP draft pattern):
         *   1. POST ZC_INTERCO_JE_HEADER      → creates document, returns accountingdocument_temp
         *   2. POST …/_Item (per line)         → creates line items via navigation association
         *   3. POST …/Activate (if draft)      → activates the document
         *
         * @param {object} oHeader   /headerData model object
         * @param {Array}  aLines    /initiatorLines model array
         * @returns {Promise<{accountingdocument_temp: string}>}
         */
        submitIntercoDocument: function (oHeader, aInitiatorLines, aRecipientLines) {
            var sRoot = "/sap/opu/odata4/sap/zsb_interco_app/srvd/sap/zsd_interco_app/0001/";

            // Convert SAP UI5 date string (MM/DD/YYYY or DD.MM.YYYY or YYYY-MM-DD) → OData Edm.Date
            function toODataDate(s) {
                if (!s) { return null; }
                if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { return s; }
                var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (m) { return m[3] + "-" + m[1].padStart(2, "0") + "-" + m[2].padStart(2, "0"); }
                m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
                if (m) { return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
                return null;
            }

            function isSamlRedirect(oXHR) {
                var sType = oXHR.getResponseHeader("Content-Type") || "";
                return sType.indexOf("text/html") !== -1;
            }

            function parseError(oXHR) {
                try {
                    var oErr = JSON.parse(oXHR.responseText);
                    return (oErr.error && oErr.error.message) ? oErr.error.message : oXHR.responseText;
                } catch (e) {
                    return oXHR.responseText || oXHR.statusText;
                }
            }

            function buildItemPayload(oLine, iSeq, sInd) {
                return {
                    referencedocumentitem:       String(iSeq * 10),
                    initiator_recipient_ind:     "X",
                    documentitemtext:            (oLine.itemText        || "").slice(0, 25),
                    assignmentreference:         (oLine.assignment      || "").slice(0, 16),
                    glaccount:                   (oLine.glAccount       || "").slice(0, 10),
                    business_partner:            (oLine.businessPartner || "").slice(0, 10),
                    currencycode:                (oHeader.currency      || "USD").slice(0, 5),
                    amountintransactioncurrency: parseFloat(oLine.amountDC) || 0,
                    debitcreditcode:             oLine.debitCredit      || "S",
                    profitcenter:                (oLine.profitCenter    || "").slice(0, 10),
                    // costcenter:                  (oLine.costCenter      || "").slice(0, 10),
                    // internalorder:               (oLine.internalOrder   || "").slice(0, 12),
                    // wbselement:                  (oLine.wbsElement      || "").slice(0, 24),
                    // tradingpartner:              (oLine.tradingPartner  || "").slice(0, 6),
                    // partnerprofitcenter:         (oLine.partnerPrCtr    || "").slice(0, 10),
                    // personnel:                   (oLine.personnel       || "").slice(0, 8),
                    // contract:                    (oLine.contract        || "").slice(0, 10),
                    // contracttype:                (oLine.contractType    || "").slice(0, 4)
                    // linereference1:              (oLine.lineRef1        || "").slice(0, 12),
                    // linereference2:              (oLine.lineRef2        || "").slice(0, 12),
                    // linereference3:              (oLine.lineRef3        || "").slice(0, 12)
                };
            }

            var oHdrPayload = {
                send_companycode:    (oHeader.initiatorCC   || "").slice(0, 4),
                rec_companycode:     (oHeader.recipientCC   || "").slice(0, 4),
                documentreferenceid: (oHeader.reference     || "").slice(0, 16),
                documentheadertext:  (oHeader.headerText    || "").slice(0, 25),
                documentdate:        toODataDate(oHeader.documentDate),
                postingdate:         toODataDate(oHeader.postingDate)
            };

            // Combine initiator (I) and recipient (R) lines, numbered sequentially
            var aItemPayloads = [];
            (aInitiatorLines || []).forEach(function (oLine, i) {
                aItemPayloads.push(buildItemPayload(oLine, i + 1, "I"));
            });
            // (aRecipientLines || []).forEach(function (oLine, i) {
            //     aItemPayloads.push(buildItemPayload(oLine, (aInitiatorLines || []).length + i + 1, "R"));
            // });

            return this._fetchCsrfToken(sRoot).then(function (sToken) {
                var oHdrs = {
                    "Accept":           "application/json",
                    "Content-Type":     "application/json",
                    "OData-Version":    "4.0",
                    "OData-MaxVersion": "4.0",
                    "X-CSRF-Token":     sToken
                };

                // ── Step 1: Create header ────────────────────────────────────
                return new Promise(function (resolve, reject) {
                
                    jQuery.ajax({
                        url:         sRoot + "ZC_INTERCO_JE_HEADER",
                        method:      "POST",
                        headers:     oHdrs,
                        contentType: "application/json",
                        data:        JSON.stringify(oHdrPayload),
                        success:     function (oData, sStatus, oXHR) {
                            if (isSamlRedirect(oXHR)) {
                                reject(new Error(
                                    "Authentication error on header creation: SAP returned an SSO redirect. " +
                                    "Ensure ui5.yaml uses USER_SAP_COM_BTP with basic auth."
                                ));
                                return;
                            }
                            console.log("================================");
                            console.log("HEADER CREATE RESPONSE");
                            console.log(oData);
                            console.log("JSON =", JSON.stringify(oData));
                            console.log("Keys =", Object.keys(oData));
                            console.log("================================");
                            resolve({ result: oData, hdrs: oHdrs });
                        },
                        error:       function (oXHR) {
                            reject(new Error("Header creation failed [" + oXHR.status + "]: " + parseError(oXHR)));
                        }
                    });
                });

            }).then(function (oCtx) {
                // ── Step 2: Create items via _Item navigation ────────────────
                var sDocId    = oCtx.result.accountingdocument_temp;
               console.log("Result =", oCtx.result);
console.log("Keys =", Object.keys(oCtx.result));
console.log("Doc ID =", sDocId);
                var bActive   = oCtx.result.IsActiveEntity === true;
                var sKeyFrag  = "ZC_INTERCO_JE_HEADER(accountingdocument_temp='" + sDocId +
                                "',IsActiveEntity=" + bActive + ")";

                var pChain = Promise.resolve();
                aItemPayloads.forEach(function (oItem) {
                    pChain = pChain.then(function () {
                        return new Promise(function (resolve, reject) {
                                console.log("Posting Item");
                    console.log(oItem);
                            jQuery.ajax({
                                url:         sRoot + sKeyFrag + "/_Item",
                                method:      "POST",
                                headers:     oCtx.hdrs,
                                contentType: "application/json",
                                data:        JSON.stringify(oItem),
                                success:     function () { resolve(); },
                                error:       function (oXHR) {
                                    reject(new Error(
                                        "Item " + oItem.referencedocumentitem +
                                        " creation failed [" + oXHR.status + "]: " + parseError(oXHR)
                                    ));
                                }
                            });
                        });
                    });
                });

                return pChain.then(function () {
                    return { docId: sDocId, bActive: bActive, sKeyFrag: sKeyFrag, hdrs: oCtx.hdrs };
                });

            }).then(function (oCtx) {
                // ── Step 3: Activate if draft ────────────────────────────────
                if (oCtx.bActive) {
                    return { accountingdocument_temp: oCtx.docId };
                }
                var sActivateUrl = sRoot + oCtx.sKeyFrag +
                                   "/com.sap.gateway.srvd.zsd_interco_app.v0001.Activate";
                    console.log("Activate URL");
                console.log(sActivateUrl);
                return new Promise(function (resolve, reject) {
                    jQuery.ajax({
                        url:         sActivateUrl,
                        method:      "POST",
                        headers:     oCtx.hdrs,
                        contentType: "application/json",
                        data:        "{}",
                        success:     function (oData, sStatus, oXHR) {
                            if (isSamlRedirect(oXHR)) {
                                reject(new Error(
                                    "Session expired during document activation. " +
                                    "The draft may remain open in SAP — check transaction FB03. " +
                                    "Refresh the page and re-submit."
                                ));
                                return;
                            }
                            var sDocRef = (oData && (
                                oData.accountingdocument_temp ||
                                oData.AccountingDocument      ||
                                oData.AccountingDocumentTemp
                            )) || oCtx.docId;
                            resolve({ accountingdocument_temp: sDocRef });
                        },
                        error:       function (oXHR) {
                            reject(new Error("Activation failed [" + oXHR.status + "]: " + parseError(oXHR)));
                        }
                    });
                });
            });
        }

    };
});
