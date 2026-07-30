sap.ui.define([
    "ZFI_INTERCO/controller/BaseController",
    "ZFI_INTERCO/service/MasterDataService",
    "ZFI_INTERCO/util/Constants",
    "ZFI_INTERCO/util/Helper",
    "ZFI_INTERCO/util/Formatter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (BaseController, MasterDataService, Constants, Helper, Formatter, JSONModel, Filter, FilterOperator, MessageBox, MessageToast, Fragment) {
    "use strict";

    // ─── GL row counter ────────────────────────────────────────────────────────
    var _rowCounter = 1;

    return BaseController.extend("ZFI_INTERCO.controller.Main", {

        formatter: Formatter,

        // ─────────────────────────────────────────────────────────────────────
        // Lifecycle
        // ─────────────────────────────────────────────────────────────────────

        onInit: function () {
            _rowCounter = 1;
            this._pCCDialog = null;
            this._sCCPicklistMode = "";
            this._pDocTypeDialog = null;
            this._initModel();
            this._loadReferenceData();
        },

        _loadReferenceData: function () {
            var oModel = this.getView().getModel();
            var that = this;
            MasterDataService.getCompanyCodes().then(function (aCodes) {
                oModel.setProperty("/referenceData/companyCodes", aCodes);
                that._loadUserDefaultCC();
            });

            MasterDataService.getAllTaxCodes().then(function (aAll) {
                oModel.setProperty("/referenceData/allTaxCodes", aAll);
                var sDefaultCountry = "ZA"; // matches DEFAULT.INITIATOR_CC = 1110
                oModel.setProperty("/referenceData/initiatorTaxCodes",
                    aAll.filter(function (t) { return t.country === sDefaultCountry; }));
            }).catch(function () {
                oModel.setProperty("/referenceData/allTaxCodes", []);
            });
            MasterDataService.getTaxCodes().then(function (aTaxCodes) {
                oModel.setProperty("/referenceData/taxCodes", aTaxCodes);
            });
            MasterDataService.getClosedPeriods().then(function (aPeriods) {
                oModel.setProperty("/referenceData/closedPeriods", aPeriods);
            });
        },

        _resolveCC: function (sCC) {
            var aCodes = this.getView().getModel().getProperty("/referenceData/companyCodes") || [];
            return aCodes.find(function (c) { return c.companyCode === sCC; }) || null;
        },

        _initModel: function () {
            _rowCounter = 1;
            var oData = {
                headerData: {
                    transactionType: Constants.TRANSACTION_TYPE.AR,
                    transactionTypeIndex: 0,
                    documentType: this.getI18nText("documentType." + Constants.DOCUMENT_TYPE.IC),
                    documentTypeCode: "IC", // Set initial default document type code
                    taxInvoiceRequired: false,
                    taxInvoiceNumber: "",
                    taxInvoiceDate: "",
                    taxInvoiceDescription: "",
                    taxVATTreatment: Constants.DEFAULT.VAT_TREATMENT,

                    initiatorCC: Constants.DEFAULT.INITIATOR_CC,
                    initiatorCCName: "Madiba Holdings (Pty) Ltd",  // resolved from _aCodes on load
                    initiatorBP: "",
                    recipientBP: "",
                    recipientBPName: "",
                    reconciliationAccount: "",
                    recipientReconciliationAccount: "",
                    recipientCC: "",
                    recipientCCName: "",
                    partyValidationVisible: false,
                    partyValidationState: "None",
                    partyValidationText: "",

                    documentDate: "",
                    postingDate: "",
                    fiscalPeriod: "",
                    fiscalYear: "",
                    periodStatusState: "None",
                    periodStatusText: "— enter posting date",
                    periodStatusIcon: "sap-icon://question-mark",
                    reference: "",
                    headerText: "",
                    currency: Constants.DEFAULT.CURRENCY,

                    // New Intercompany Amount Fields
                    netAmount: "0.00",
                    taxAmount: "0.00",
                    totalIntercoAmount: "0.00",

                    initiatorTaxCode: "",
                    initiatorTaxAmount: "0.00",
                    initiatorCountry: "ZA (T001-LAND1 for 1110)",
                    initiatorTaxCodeState: "None",
                    recipientTaxCode: "",
                    recipientTaxAmount: "0.00",
                    recipientCountry: "— (derived from Recipient CC)",
                    recipientTaxCodeState: "None",
                    taxCalcVisible: false,
                    taxCalcRows: [],

                    comments: "",
                    attachments: [
                        { fileName: "Recharge_Calculation_Apr26.xlsx", fileType: "XLSX", fileSize: "48 KB", uploader: "S.Wayland", uploadDate: "16.04.2026", isSystem: false }
                    ]
                },

                initiatorLines: [
                    {
                        rowNum: 1,
                        isSystemLine: true,
                        debitCredit: Constants.DC_INDICATOR.DEBIT,
                        glAccount: "—",
                        businessPartner: "—",
                        amountDC: "0.00",
                        taxCode: "",
                        tradingPartner: "—",
                        partnerPrCtr: "",
                        wbsElement: "",
                        costCenter: "",
                        profitCenter: "",
                        internalOrder: "",
                        personnel: "",
                        contract: "",
                        contractType: "",
                        assignment: "",
                        itemText: "",
                        lineRef1: "",
                        lineRef2: "",
                        lineRef3: ""
                    }
                ],

                initiatorBalance: {
                    totalDebits: "0.00",
                    totalCredits: "0.00",
                    netAmount: "0.00",
                    isBalanced: false
                },

                initiatorValidation: {
                    visible: false,
                    state: "None",
                    text: "Not yet validated."
                },

                recipientLines: [
                    {
                        rowNum: 1,
                        isSystemLine: true,
                        debitCredit: Constants.DC_INDICATOR.CREDIT,
                        glAccount: "—",
                        businessPartner: "—",
                        amountDC: "0.00",
                        taxCode: "",
                        tradingPartner: "—",
                        partnerPrCtr: "",
                        wbsElement: "",
                        costCenter: "",
                        profitCenter: "",
                        internalOrder: "",
                        personnel: "",
                        contract: "",
                        contractType: "",
                        assignment: "",
                        itemText: "",
                        lineRef1: "",
                        lineRef2: "",
                        lineRef3: ""
                    }
                ],

                recipientBalance: {
                    totalDebits: "0.00",
                    totalCredits: "0.00",
                    netAmount: "0.00",
                    isBalanced: false
                },

                recipientValidation: {
                    visible: false,
                    state: "None",
                    text: "Not yet validated."
                },

                workflow: {
                    status: Constants.WORKFLOW_STATUS.DRAFT,
                    statusState: "Warning",
                    intercoRef: "[NEW — assigned on save]"
                },

                appState: {
                    isBusy: false,
                    isEditMode: false,
                    isHeaderEditable: false,
                    isRecipientEditable: false
                },

                referenceData: {
                    companyCodes:      [],
                    taxCodes:          [],
                    allTaxCodes:       [],
                    initiatorTaxCodes: [],
                    recipientTaxCodes: [],
                    closedPeriods:     [],
                    documentTypes:     []
                }
            };

            var oModel = new JSONModel(oData);
            oModel.setSizeLimit(500);
            this.getView().setModel(oModel);
        },

        // ─────────────────────────────────────────────────────────────────────
        // Transaction Control
        // ─────────────────────────────────────────────────────────────────────

        onTransactionTypeChange: function (oEvent) {
            var oModel  = this.getView().getModel();
            var iIdx    = oEvent.getParameter("selectedIndex");
          
            // index 0 -> AR (IC Invoice), index 1 -> ACCRUAL (IC Accrual Journal)
            var sTxType = [
                Constants.TRANSACTION_TYPE.AR,
                Constants.TRANSACTION_TYPE.ACCRUAL
            ][iIdx];

            oModel.setProperty("/headerData/transactionType", sTxType);
            oModel.setProperty("/headerData/transactionTypeIndex", iIdx);

            this._deriveDocumentType(iIdx);
            this._syncBPClearingLine();
            this._syncRecipientBPClearingLine();
        },

        _deriveDocumentType: function (iIdx) {
            var oModel = this.getView().getModel();
            
            // Set document code automatically: IC for Invoice, IA for Accrual
            var sCode = (iIdx === 0) ? Constants.DOCUMENT_TYPE.IC : Constants.DOCUMENT_TYPE.IA;
            
            oModel.setProperty("/headerData/documentTypeCode", sCode);
            oModel.setProperty("/headerData/documentType", this.getI18nText("documentType." + sCode));
        },

        onTaxInvoiceCheck: function () {
            // Visibility is expression-bound; no extra logic needed here.
        },

        // ─────────────────────────────────────────────────────────────────────
        // User Default Company Code
        // ─────────────────────────────────────────────────────────────────────

        _loadUserDefaultCC: function () {
            var oModel = this.getView().getModel();

            if (!sap.ushell || !sap.ushell.Container) {
                return;
            }

            var sUserId = sap.ushell.Container.getService("UserInfo").getId();
            if (!sUserId) { return; }

            jQuery.ajax({
                url: "/sap/opu/odata/sap/CA_USRAPIV2_SRV/PersonalSettingCollection" +
                     "?$filter=Id eq 'BUK'&$format=json",
                method: "GET",
                success: function (oData) {
                    var aResults = oData && oData.d && oData.d.results;
                    var sCC = aResults && aResults[0] && aResults[0].Value;
                    if (!sCC) { return; }

                    sCC = sCC.trim().toUpperCase();
                    oModel.setProperty("/headerData/initiatorCC", sCC);
                    var oCC = this._resolveCC(sCC);
                    oModel.setProperty("/headerData/initiatorCCName",
                        oCC ? oCC.name : "— Unknown company code");
                    oModel.setProperty("/headerData/initiatorCountry",
                        oCC ? oCC.country + " (T001-LAND1 for " + sCC + ")" : "—");
                }.bind(this)
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // Party Details
        // ─────────────────────────────────────────────────────────────────────

        onInitiatorCCChange: function () {
            var oModel = this.getView().getModel();
            var sCC = (oModel.getProperty("/headerData/initiatorCC") || "").trim().toUpperCase();
            oModel.setProperty("/headerData/initiatorCC", sCC);
            var oCC = this._resolveCC(sCC);
            oModel.setProperty("/headerData/initiatorCCName", oCC ? oCC.name : (sCC ? "— Unknown company code" : ""));
            oModel.setProperty("/headerData/initiatorCountry",
                oCC ? oCC.country + " (T001-LAND1 for " + sCC + ")" : "—");

            oModel.setProperty("/headerData/initiatorTaxCode", "");
            oModel.setProperty("/referenceData/initiatorTaxCodes", []);
            if (oCC && oCC.country) {
                var sIniCountry = oCC.country;
                var aAllIni = oModel.getProperty("/referenceData/allTaxCodes") || [];
                if (aAllIni.length > 0) {
                    oModel.setProperty("/referenceData/initiatorTaxCodes",
                        aAllIni.filter(function (t) { return t.country === sIniCountry; }));
                } else {
                    MasterDataService.getAllTaxCodes().then(function (aAll) {
                        oModel.setProperty("/referenceData/allTaxCodes", aAll);
                        oModel.setProperty("/referenceData/initiatorTaxCodes",
                            aAll.filter(function (t) { return t.country === sIniCountry; }));
                    });
                }
            }

            oModel.setProperty("/headerData/initiatorBP", "");
            oModel.setProperty("/headerData/recipientBP", "");
            oModel.setProperty("/headerData/recipientBPName", "");
            oModel.setProperty("/headerData/partyValidationVisible", false);

            this._propagateTradingPartner();
            this._propagateRecipientTradingPartner();
            this._syncBPClearingLine();
            this._syncRecipientBPClearingLine();
            this._validateParties();

            var sRecCC = (oModel.getProperty("/headerData/recipientCC") || "").trim().toUpperCase();
            if (sCC && sRecCC) {
                this._autoDeriveBPs(sRecCC, sCC);
            }
        },

        onRecipientCCChange: function () {
            var oModel = this.getView().getModel();
            var sCC = (oModel.getProperty("/headerData/recipientCC") || "").trim().toUpperCase();
            oModel.setProperty("/headerData/recipientCC", sCC);
            var oCC = this._resolveCC(sCC);
            oModel.setProperty("/headerData/recipientCCName", oCC ? oCC.name : (sCC ? "— Unknown company code" : ""));
            oModel.setProperty("/headerData/recipientCountry",
                oCC ? oCC.country + " (T001-LAND1 for " + sCC + ")" : "—");

            oModel.setProperty("/headerData/recipientTaxCode", "");
            oModel.setProperty("/referenceData/recipientTaxCodes", []);
            if (oCC && oCC.country) {
                var sRecCountry = oCC.country;
                var aAllRec = oModel.getProperty("/referenceData/allTaxCodes") || [];
                if (aAllRec.length > 0) {
                    oModel.setProperty("/referenceData/recipientTaxCodes",
                        aAllRec.filter(function (t) { return t.country === sRecCountry; }));
                } else {
                    MasterDataService.getAllTaxCodes().then(function (aAll) {
                        oModel.setProperty("/referenceData/allTaxCodes", aAll);
                        oModel.setProperty("/referenceData/recipientTaxCodes",
                            aAll.filter(function (t) { return t.country === sRecCountry; }));
                    });
                }
            }

            oModel.setProperty("/headerData/recipientBP", "");
            oModel.setProperty("/headerData/recipientBPName", "");
            oModel.setProperty("/headerData/initiatorBP", "");
            this._propagateTradingPartner();
            this._validateParties();

            var sIniCC = (oModel.getProperty("/headerData/initiatorCC") || "").trim().toUpperCase();
            if (sIniCC && sCC) {
                this._autoDeriveBPs(sCC, sIniCC);
            }
        },

        _autoDeriveBPs: function (sRecCC, sIniCC) {
            var oModel = this.getView().getModel();
            var sTxType = oModel.getProperty("/headerData/transactionType");
            var that = this;

            oModel.setProperty("/appState/isBusy", true);

            // Stage 1: Derive forward BP (Customer) and reverse BP in parallel.
            Promise.all([
                MasterDataService.getBusinessPartners(sIniCC, sRecCC, sTxType),
                MasterDataService.getReverseBP(sRecCC, sIniCC)
            ]).then(function (aResults) {
                var aForward = aResults[0];
                var oReverse = aResults[1];

                if (!aForward.length) {
                    oModel.setProperty("/appState/isBusy", false);
                    MessageToast.show("No intercompany relationship found between " + sIniCC + " and " + sRecCC + ".");
                    return;
                }

                var oFwd = aForward[0];
                var sCustomer = oFwd.bp;
                var sKontsFallback = oFwd.konts || sCustomer;

                // Write BP fields immediately so party validation can run.
                oModel.setProperty("/headerData/recipientBP", sCustomer);
                oModel.setProperty("/headerData/recipientBPName", oFwd.bpName);
                oModel.setProperty("/headerData/initiatorBP", oReverse ? oReverse.bp : "—");

                // Stage 2: Fetch reconciliation accounts for both GL blocks in parallel.
                // Initiator GL: I_SupplierCompany(recipientCC, recipientBP)
                // Recipient GL: I_CustomerCompany(initiatorCC, initiatorBP)
                var sInitiatorBPForRecon = oReverse ? oReverse.bp : "";

                var fnFinalize = function () {
                    oModel.setProperty("/appState/isBusy", false);
                    that._validateParties();
                    that._syncBPClearingLine();
                    that._propagateTradingPartner();
                    that._syncRecipientBPClearingLine();
                    that._propagateRecipientTradingPartner();
                };

                var pSupplier = MasterDataService.getReconciliationAccount(sRecCC, sCustomer)
                    .catch(function (oError) {
                        jQuery.sap.log.error(
                            "[ZFI_INTERCO] I_SupplierCompany failed for CC=" + sRecCC +
                            ", Supplier=" + sCustomer + ". " +
                            (oError && oError.message ? oError.message : "")
                        );
                        return null;
                    });

                var pCustomer = MasterDataService.getReconciliationAccountCustomer(sIniCC, sInitiatorBPForRecon)
                    .catch(function (oError) {
                        jQuery.sap.log.error(
                            "[ZFI_INTERCO] I_CustomerCompany failed for CC=" + sIniCC +
                            ", Customer=" + sInitiatorBPForRecon + ". " +
                            (oError && oError.message ? oError.message : "")
                        );
                        return null;
                    });

                Promise.all([pSupplier, pCustomer]).then(function (aReconResults) {
                    var sReconAcct = aReconResults[0]
                        ? aReconResults[0].reconciliationAccount
                        : sKontsFallback;
                    oModel.setProperty("/headerData/reconciliationAccount", sReconAcct);
                    if (!aReconResults[0]) {
                        MessageToast.show("Initiator GL account derivation failed — using T001U clearing account as fallback.");
                    }

                    var sRecipReconAcct = aReconResults[1]
                        ? aReconResults[1].reconciliationAccount
                        : sInitiatorBPForRecon;
                    oModel.setProperty("/headerData/recipientReconciliationAccount", sRecipReconAcct);
                    if (!aReconResults[1]) {
                        MessageToast.show("Recipient GL account derivation failed — using BP number as fallback.");
                    }

                    fnFinalize();
                });

            }, function () {
                oModel.setProperty("/appState/isBusy", false);
                MessageToast.show("Failed to derive intercompany business partners.");
            });
        },

        // ─── Company Code Value Help ───────────────────────────────────────────

        onInitiatorCCValueHelp: function () {
            this._sCCPicklistMode = "initiator";
            this._openCCPicklist();
        },

        onRecipientCCValueHelp: function () {
            this._sCCPicklistMode = "recipient";
            this._openCCPicklist();
        },

        _openCCPicklist: function () {
            var oView = this.getView();
            if (!this._pCCDialog) {
                this._pCCDialog = Fragment.load({
                    id: oView.getId() + "--cc",
                    name: "ZFI_INTERCO.fragment.CCPicklist",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pCCDialog.then(function (oDialog) { oDialog.open(); });
        },

        onCCPicklistSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("value");
            var oBinding = oEvent.getParameter("itemsBinding");
            if (!sQuery) {
                oBinding.filter([]);
                return;
            }
            oBinding.filter([new Filter([
                new Filter("companyCode", FilterOperator.Contains, sQuery),
                new Filter("name", FilterOperator.Contains, sQuery),
                new Filter("country", FilterOperator.Contains, sQuery)
            ], false)]);
        },

        onCCPicklistConfirm: function (oEvent) {
            var oSelected = oEvent.getParameter("selectedItem");
            if (!oSelected) return;

            var oCC = oSelected.getBindingContext().getObject();
            var oModel = this.getView().getModel();

            if (this._sCCPicklistMode === "initiator") {
                oModel.setProperty("/headerData/initiatorCC", oCC.companyCode);
                this.onInitiatorCCChange();
            } else {
                oModel.setProperty("/headerData/recipientCC", oCC.companyCode);
                this.onRecipientCCChange();
            }
        },

        onCCPicklistCancel: function () {
            // SelectDialog self-closes
        },

        // ─── Document Type Value Help ──────────────────────────────────────────

        onDocTypeValueHelp: function () {
            this._openDocTypePicklist();
        },

        _openDocTypePicklist: function () {
            var oView = this.getView();
            var oModel = oView.getModel();

            if (!this._pDocTypeDialog) {
                this._pDocTypeDialog = Fragment.load({
                    id: oView.getId() + "--docType",
                    name: "ZFI_INTERCO.fragment.DocTypePicklist",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pDocTypeDialog.then(function (oDialog) {
                oDialog.open();

                if ((oModel.getProperty("/referenceData/documentTypes") || []).length > 0) {
                    return;
                }

                oDialog.setBusy(true);
                MasterDataService.getDocumentTypes()
                    .then(function (aTypes) {
                        oDialog.setBusy(false);
                        if (!aTypes.length) {
                            MessageToast.show("No document types returned from the service.");
                            return;
                        }
                        oModel.setProperty("/referenceData/documentTypes", aTypes);
                    })
                    .catch(function () {
                        oDialog.setBusy(false);
                        MessageToast.show("Failed to load document types. Check the service connection.");
                    });
            });
        },

        onDocTypePicklistSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("value");
            var oBinding = oEvent.getParameter("itemsBinding");
            if (!sQuery) {
                oBinding.filter([]);
                return;
            }
            oBinding.filter([new Filter("documentType", FilterOperator.Contains, sQuery)]);
        },

        onDocTypePicklistConfirm: function (oEvent) {
            var oSelected = oEvent.getParameter("selectedItem");
            if (!oSelected) { return; }
            var sType = oSelected.getBindingContext().getObject().documentType;
            this.getView().getModel().setProperty("/headerData/documentTypeCode", sType);
        },

        onDocTypePicklistCancel: function () {
            // SelectDialog self-closes
        },

        _validateParties: function () {
            var oModel = this.getView().getModel();
            var sIniCC = oModel.getProperty("/headerData/initiatorCC");
            var sRecCC = oModel.getProperty("/headerData/recipientCC");
            var sRecBP = oModel.getProperty("/headerData/recipientBP");

            if (sIniCC && sRecCC && sRecBP) {
                oModel.setProperty("/headerData/partyValidationVisible", true);
                oModel.setProperty("/headerData/partyValidationState", "Success");
                oModel.setProperty("/headerData/partyValidationText",
                    "T001U relationship confirmed. Initiator " + sIniCC + " ↔ Recipient " + sRecCC +
                    ". Interco clearing accounts derived from T001U.");
            } else {
                oModel.setProperty("/headerData/partyValidationVisible", false);
            }
        },

        // ─────────────────────────────────────────────────────────────────────
        // Document Details & Amount Calculations
        // ─────────────────────────────────────────────────────────────────────

        onDocumentDateChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            this.getView().getModel().setProperty("/headerData/documentDate", sValue);
        },

        onPostingDateChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oModel = this.getView().getModel();
            oModel.setProperty("/headerData/postingDate", sValue);

            if (sValue) {
                var oParsed = Helper.parseDate(sValue);
                if (oParsed) {
                    var sPeriod = String(oParsed.month).padStart(2, "0");
                    var sYear = String(oParsed.year);
                    oModel.setProperty("/headerData/fiscalPeriod", sPeriod);
                    oModel.setProperty("/headerData/fiscalYear", sYear);
                    this._checkPeriodStatus(sPeriod, sYear);
                }
            }
        },

        _checkPeriodStatus: function (sPeriod, sYear) {
            var oModel = this.getView().getModel();
            var sKey = sPeriod + "/" + sYear;
            var aClosedPeriods = oModel.getProperty("/referenceData/closedPeriods") || [];
            var bClosed = aClosedPeriods.indexOf(sKey) > -1;
            oModel.setProperty("/headerData/periodStatusState", bClosed ? "Error" : "Success");
            oModel.setProperty("/headerData/periodStatusText",
                "Period " + sPeriod + "/" + sYear + (bClosed ? " — CLOSED, posting blocked" : " — Open"));
            oModel.setProperty("/headerData/periodStatusIcon",
                bClosed ? "sap-icon://decline" : "sap-icon://accept");
        },

        onIntercoAmountChange: function () {
            var oModel = this.getView().getModel();

            var fNet = parseFloat(oModel.getProperty("/headerData/netAmount")) || 0;
            var fTax = parseFloat(oModel.getProperty("/headerData/taxAmount")) || 0;

            // Total Intercompany Amount = Net + Tax
            var fTotal = fNet + fTax;

            oModel.setProperty("/headerData/totalIntercoAmount", fTotal.toFixed(2));

            this._recalculateTax();
            this._syncBPClearingLine();
            this._syncRecipientBPClearingLine();
            this._recalculateBalance();
            this._validateTaxCodeState();
        },

        // ─────────────────────────────────────────────────────────────────────
        // Tax Details
        // ─────────────────────────────────────────────────────────────────────

        onInitiatorTaxCodeChange: function () {
            this._recalculateTax();
            this._syncBPClearingLine();
            this._recalculateBalance();
            this._syncRecipientBPClearingLine();
            this._validateTaxCodeState();
        },

        onRecipientTaxCodeChange: function () {
            this._recalculateTax();
            this._syncRecipientBPClearingLine();
            this._validateTaxCodeState();
        },

        _validateTaxCodeState: function () {
            var oModel = this.getView().getModel();
            var fTax = parseFloat(oModel.getProperty("/headerData/taxAmount")) || 0;
            var sIni = oModel.getProperty("/headerData/initiatorTaxCode") || "";
            var sRec = oModel.getProperty("/headerData/recipientTaxCode") || "";
            oModel.setProperty("/headerData/initiatorTaxCodeState", (fTax > 0 && !sIni) ? "Error" : "None");
            oModel.setProperty("/headerData/recipientTaxCodeState",  (fTax > 0 && !sRec) ? "Error" : "None");
        },

        _recalculateTax: function () {
            var oModel = this.getView().getModel();
            var fGross = parseFloat(oModel.getProperty("/headerData/totalIntercoAmount")) || 0;
            var sIniCode = oModel.getProperty("/headerData/initiatorTaxCode") || "";
            var sRecCode = oModel.getProperty("/headerData/recipientTaxCode") || "";

            var aIniCodes = oModel.getProperty("/referenceData/initiatorTaxCodes") || [];
            var aRecCodes = oModel.getProperty("/referenceData/recipientTaxCodes") || [];
            var oIniTax = aIniCodes.find(function (t) { return t.code === sIniCode; });
            var oRecTax = aRecCodes.find(function (t) { return t.code === sRecCode; });
            var fIniRate = oIniTax ? oIniTax.rate : 0;
            var fRecRate = oRecTax ? oRecTax.rate : 0;

            var fIniTax = fGross > 0 ? (fGross * fIniRate / (1 + fIniRate)) : 0;
            var fRecTax = fGross > 0 ? (fGross * fRecRate / (1 + fRecRate)) : 0;

            oModel.setProperty("/headerData/initiatorTaxAmount", fIniTax.toFixed(2));
            oModel.setProperty("/headerData/recipientTaxAmount", fRecTax.toFixed(2));

            var aRows = [];
            var sCcy = oModel.getProperty("/headerData/currency") || Constants.DEFAULT.CURRENCY;
            var sIniCC = (oModel.getProperty("/headerData/initiatorCC") || "").trim().toUpperCase();
            var sRecCC = (oModel.getProperty("/headerData/recipientCC") || "").trim().toUpperCase();

            if (fGross > 0 && sIniCode) {
                aRows.push({
                    entity: "Initiator" + (sIniCC ? " (" + sIniCC + ")" : ""),
                    taxCode: sIniCode,
                    rate: (fIniRate * 100).toFixed(0) + "%",
                    gross: fGross.toFixed(2),
                    taxAmount: fIniTax.toFixed(2),
                    netAmount: (fGross - fIniTax).toFixed(2),
                    currency: sCcy
                });
            }
            if (fGross > 0 && sRecCode) {
                aRows.push({
                    entity: "Recipient" + (sRecCC ? " (" + sRecCC + ")" : ""),
                    taxCode: sRecCode,
                    rate: (fRecRate * 100).toFixed(0) + "%",
                    gross: fGross.toFixed(2),
                    taxAmount: fRecTax.toFixed(2),
                    netAmount: (fGross - fRecTax).toFixed(2),
                    currency: sCcy
                });
            }

            oModel.setProperty("/headerData/taxCalcRows", aRows);
            oModel.setProperty("/headerData/taxCalcVisible", aRows.length > 0);
        },

        // ─────────────────────────────────────────────────────────────────────
        // Attachments
        // ─────────────────────────────────────────────────────────────────────

        onAttachmentAdd: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var aFiles = oEvent.getParameter("files");
            if (!aFiles || !aFiles.length) return;

            var oModel = this.getView().getModel();
            var aAttachments = oModel.getProperty("/headerData/attachments") || [];

            for (var i = 0; i < aFiles.length; i++) {
                var oFile = aFiles[i];
                aAttachments.push({
                    fileName: oFile.name,
                    fileType: (oFile.name.split(".").pop() || "").toUpperCase(),
                    fileSize: Helper.formatFileSize(oFile.size) || "—",
                    uploader: "Current User",
                    uploadDate: new Date().toLocaleDateString("en-GB"),
                    isSystem: false
                });
            }
            oModel.setProperty("/headerData/attachments", aAttachments);
            oFileUploader.clear();
        },

        onAttachmentDelete: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sPath = oCtx.getPath();
            var iIndex = parseInt(sPath.split("/").pop(), 10);
            var oModel = this.getView().getModel();
            var aAttachments = oModel.getProperty("/headerData/attachments");
            aAttachments.splice(iIndex, 1);
            oModel.setProperty("/headerData/attachments", aAttachments);
        },

        // ─────────────────────────────────────────────────────────────────────
        // GL Coding — Initiator
        // ─────────────────────────────────────────────────────────────────────

        onAddInitiatorLine: function () {
            _rowCounter++;
            var oModel = this.getView().getModel();
            var aLines = oModel.getProperty("/initiatorLines") || [];
            var sRecCC = oModel.getProperty("/headerData/recipientCC") || "";
            var sIniTaxCode = oModel.getProperty("/headerData/initiatorTaxCode") || "";

            aLines.push({
                rowNum: aLines.length + 1,
                isSystemLine: false,
                debitCredit: Constants.DC_INDICATOR.CREDIT,
                glAccount: "",
                businessPartner: "",
                amountDC: "",
                taxCode: sIniTaxCode,
                tradingPartner: sRecCC,
                partnerPrCtr: "",
                wbsElement: "",
                costCenter: "",
                profitCenter: "",
                internalOrder: "",
                personnel: "",
                contract: "",
                contractType: "",
                assignment: "",
                itemText: "",
                lineRef1: "",
                lineRef2: "",
                lineRef3: ""
            });

            oModel.setProperty("/initiatorLines", aLines);
            this._recalculateBalance();
        },

        onDeleteInitiatorLine: function (oEvent) {
            var oModel = this.getView().getModel();
            var oCtx = oEvent.getSource().getBindingContext();
            var sPath = oCtx.getPath();
            var iIndex = parseInt(sPath.split("/").pop(), 10);

            var aLines = oModel.getProperty("/initiatorLines");
            if (aLines[iIndex] && aLines[iIndex].isSystemLine) {
                MessageToast.show("BP clearing line cannot be deleted.");
                return;
            }
            aLines.splice(iIndex, 1);
            aLines.forEach(function (oLine, i) { oLine.rowNum = i + 1; });
            oModel.setProperty("/initiatorLines", aLines);
            this._recalculateBalance();
        },

        onGLLineChange: function () {
            this._recalculateBalance();
        },

        _recalculateBalance: function () {
            var oModel = this.getView().getModel();
            var aLines = oModel.getProperty("/initiatorLines") || [];
            var fTotalDr = 0, fTotalCr = 0;

            aLines.forEach(function (oLine) {
                var fAmt = parseFloat(String(oLine.amountDC).replace(/[^0-9.\-]/g, "")) || 0;
                if (oLine.debitCredit === Constants.DC_INDICATOR.DEBIT) {
                    fTotalDr += fAmt;
                } else {
                    fTotalCr += fAmt;
                }
            });

            var fNet = fTotalDr - fTotalCr;
            var bBalanced = Math.abs(fNet) < Constants.BALANCE_TOLERANCE;

            oModel.setProperty("/initiatorBalance", {
                totalDebits: fTotalDr.toFixed(2),
                totalCredits: fTotalCr.toFixed(2),
                netAmount: fNet.toFixed(2),
                isBalanced: bBalanced
            });
        },

        _syncBPClearingLine: function () {
            var oModel = this.getView().getModel();
            var aLines = oModel.getProperty("/initiatorLines");
            if (!aLines || !aLines.length) return;

            var sTxType        = oModel.getProperty("/headerData/transactionType");
            var sInitiatorBP   = oModel.getProperty("/headerData/initiatorBP") || "—";
            var sRecipientBP   = oModel.getProperty("/headerData/recipientBP") || "—";
            var sReconAccount  = oModel.getProperty("/headerData/reconciliationAccount") || sRecipientBP;
            var fGross         = parseFloat(oModel.getProperty("/headerData/totalIntercoAmount")) || 0;
            var fTaxAmt        = parseFloat(oModel.getProperty("/headerData/initiatorTaxAmount")) || 0;
            var sIniTaxCode    = oModel.getProperty("/headerData/initiatorTaxCode") || "";

            // GL Account = ReconciliationAccount from I_SupplierCompany(recipientCC, recipientBP).
            // Business Partner = Recipient BP (how the recipient appears as a supplier in initiator's books).
            // Trading Partner  = Recipient Company Code (the intercompany counterpart).
            aLines[0].glAccount       = sReconAccount;
            aLines[0].businessPartner = sRecipientBP;
            aLines[0].tradingPartner  = oModel.getProperty("/headerData/recipientCC") || "—";
            aLines[0].amountDC        = (fGross - fTaxAmt).toFixed(2);
            aLines[0].taxCode         = sIniTaxCode;
            aLines[0].debitCredit     = sTxType === Constants.TRANSACTION_TYPE.AP
                ? Constants.DC_INDICATOR.CREDIT
                : Constants.DC_INDICATOR.DEBIT;

            oModel.setProperty("/initiatorLines", aLines);
            this._recalculateBalance();
        },

        _propagateTradingPartner: function () {
            var oModel = this.getView().getModel();
            var aLines = oModel.getProperty("/initiatorLines") || [];
            var sRecCC = (oModel.getProperty("/headerData/recipientCC") || "").trim();
            aLines.forEach(function (oLine) {
                oLine.tradingPartner = sRecCC || "—";
            });
            oModel.setProperty("/initiatorLines", aLines);
        },

        // ─────────────────────────────────────────────────────────────────────
        // GL Coding — Recipient
        // ─────────────────────────────────────────────────────────────────────

        onAddRecipientLine: function () {
            var oModel = this.getView().getModel();
            var aLines = oModel.getProperty("/recipientLines") || [];
            var sIniCC = oModel.getProperty("/headerData/initiatorCC") || "";
            var sRecTaxCode = oModel.getProperty("/headerData/recipientTaxCode") || "";

            aLines.push({
                rowNum: aLines.length + 1,
                isSystemLine: false,
                debitCredit: Constants.DC_INDICATOR.DEBIT,
                glAccount: "",
                businessPartner: "",
                amountDC: "",
                taxCode: sRecTaxCode,
                tradingPartner: sIniCC,
                partnerPrCtr: "",
                wbsElement: "",
                costCenter: "",
                profitCenter: "",
                internalOrder: "",
                personnel: "",
                contract: "",
                contractType: "",
                assignment: "",
                itemText: "",
                lineRef1: "",
                lineRef2: "",
                lineRef3: ""
            });

            oModel.setProperty("/recipientLines", aLines);
            this._recalculateRecipientBalance();
        },

        onDeleteRecipientLine: function (oEvent) {
            var oModel = this.getView().getModel();
            var oCtx = oEvent.getSource().getBindingContext();
            var sPath = oCtx.getPath();
            var iIndex = parseInt(sPath.split("/").pop(), 10);

            var aLines = oModel.getProperty("/recipientLines");
            if (aLines[iIndex] && aLines[iIndex].isSystemLine) {
                MessageToast.show("BP clearing line cannot be deleted.");
                return;
            }
            aLines.splice(iIndex, 1);
            aLines.forEach(function (oLine, i) { oLine.rowNum = i + 1; });
            oModel.setProperty("/recipientLines", aLines);
            this._recalculateRecipientBalance();
        },

        onRecipientGLLineChange: function () {
            this._recalculateRecipientBalance();
        },

        _recalculateRecipientBalance: function () {
            var oModel = this.getView().getModel();
            var aLines = oModel.getProperty("/recipientLines") || [];
            var fTotalDr = 0, fTotalCr = 0;

            aLines.forEach(function (oLine) {
                var fAmt = parseFloat(String(oLine.amountDC).replace(/[^0-9.\-]/g, "")) || 0;
                if (oLine.debitCredit === Constants.DC_INDICATOR.DEBIT) {
                    fTotalDr += fAmt;
                } else {
                    fTotalCr += fAmt;
                }
            });

            var fNet = fTotalDr - fTotalCr;
            var bBalanced = Math.abs(fNet) < Constants.BALANCE_TOLERANCE;

            oModel.setProperty("/recipientBalance", {
                totalDebits: fTotalDr.toFixed(2),
                totalCredits: fTotalCr.toFixed(2),
                netAmount: fNet.toFixed(2),
                isBalanced: bBalanced
            });
        },

        _syncRecipientBPClearingLine: function () {
            var oModel = this.getView().getModel();
            var aLines = oModel.getProperty("/recipientLines");
            if (!aLines || !aLines.length) return;

            var sTxType        = oModel.getProperty("/headerData/transactionType");
            var sInitiatorBP   = oModel.getProperty("/headerData/initiatorBP") || "—";
            var sReconAccount  = oModel.getProperty("/headerData/recipientReconciliationAccount") || sInitiatorBP;
            var fGross         = parseFloat(oModel.getProperty("/headerData/totalIntercoAmount")) || 0;
            var fTaxAmt        = parseFloat(oModel.getProperty("/headerData/recipientTaxAmount")) || 0;
            var sRecTaxCode    = oModel.getProperty("/headerData/recipientTaxCode") || "";

            // GL Account = ReconciliationAccount from I_CustomerCompany(initiatorCC, initiatorBP).
            // Business Partner = Initiator BP (how the initiator appears as a customer in recipient's books).
            // Trading Partner  = Initiator Company Code (the intercompany counterpart).
            aLines[0].glAccount       = sReconAccount;
            aLines[0].businessPartner = sInitiatorBP;
            aLines[0].tradingPartner  = oModel.getProperty("/headerData/initiatorCC") || "—";
            aLines[0].amountDC        = (fGross - fTaxAmt).toFixed(2);
            aLines[0].taxCode         = sRecTaxCode;
            aLines[0].debitCredit     = sTxType === Constants.TRANSACTION_TYPE.AP
                ? Constants.DC_INDICATOR.DEBIT
                : Constants.DC_INDICATOR.CREDIT;

            oModel.setProperty("/recipientLines", aLines);
            this._recalculateRecipientBalance();
        },

        _propagateRecipientTradingPartner: function () {
            var oModel = this.getView().getModel();
            var aLines = oModel.getProperty("/recipientLines") || [];
            var sIniCC = (oModel.getProperty("/headerData/initiatorCC") || "").trim();
            aLines.forEach(function (oLine) {
                oLine.tradingPartner = sIniCC || "—";
            });
            oModel.setProperty("/recipientLines", aLines);
        },

        onRecipientValidate: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/appState/isBusy", true);

            var that = this;
            setTimeout(function () {
                var aMessages = [];

                function addMsg(type, cls, num, text) {
                    aMessages.push({ type: type, msgClass: cls, msgNum: num, text: text });
                }

                var aLines = oModel.getProperty("/recipientLines") || [];
                var aUserLines = aLines.filter(function (l) { return !l.isSystemLine; });

                var oHeader = oModel.getProperty("/headerData");
                if (!oHeader.initiatorCC) addMsg("E", "ZFI", "001", "Initiator Company Code is required.");
                if (!oHeader.recipientCC) addMsg("E", "ZFI", "002", "Recipient Company Code is required.");
                if (!oHeader.postingDate) addMsg("E", "ZFI", "003", "Posting Date is required.");

                var fTaxAmount = parseFloat(oHeader.taxAmount) || 0;
                if (fTaxAmount > 0 && !oHeader.recipientTaxCode) {
                    oModel.setProperty("/appState/isBusy", false);
                    oModel.setProperty("/recipientValidation", {
                        visible: true,
                        state: "Error",
                        text: "Tax Code is required when a Tax Amount is entered. Please select a Tax / VAT Code."
                    });
                    return;
                }

                if (aUserLines.length === 0) {
                    addMsg("E", "ZFI", "004", "At least one G/L line item must be entered.");
                }

                aUserLines.forEach(function (line, idx) {
                    if (!line.glAccount) {
                        addMsg("E", "ZFI", "005", "Line " + (idx + 2) + ": G/L Account is missing.");
                    }
                    if (!line.amountDC || parseFloat(line.amountDC) === 0) {
                        addMsg("E", "ZFI", "006", "Line " + (idx + 2) + ": Amount must be greater than zero.");
                    }
                });

                var oBalance = oModel.getProperty("/recipientBalance");
                if (!oBalance.isBalanced) {
                    addMsg("E", "ZFI", "007", "Document is not in balance. Net difference: " + oBalance.netAmount);
                }

                oModel.setProperty("/appState/isBusy", false);

                var bHasError = aMessages.some(function (m) { return m.type === "E"; });
                if (bHasError) {
                    oModel.setProperty("/recipientValidation", {
                        visible: true,
                        state: "Error",
                        text: "Validation failed with " + aMessages.length + " error(s)."
                    });
                    MessageBox.error("Validation failed. Please review the highlighted errors.");
                } else {
                    oModel.setProperty("/recipientValidation", {
                        visible: true,
                        state: "Success",
                        text: "All checks passed successfully. Document is ready to post or submit."
                    });
                    MessageToast.show("Validation successful!");
                }
            }, 500);
        },

        onInitiatorValidate: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/appState/isBusy", true);

            var that = this;
            setTimeout(function () {
                var aMessages = [];

                function addMsg(type, cls, num, text) {
                    aMessages.push({ type: type, msgClass: cls, msgNum: num, text: text });
                }

                var aLines = oModel.getProperty("/initiatorLines") || [];
                var aUserLines = aLines.filter(function (l) { return !l.isSystemLine; });

                // Header validation
                var oHeader = oModel.getProperty("/headerData");
                if (!oHeader.initiatorCC) addMsg("E", "ZFI", "001", "Initiator Company Code is required.");
                if (!oHeader.recipientCC) addMsg("E", "ZFI", "002", "Recipient Company Code is required.");
                if (!oHeader.postingDate) addMsg("E", "ZFI", "003", "Posting Date is required.");

                var fTaxAmount = parseFloat(oHeader.taxAmount) || 0;
                var sTaxCode = oHeader.initiatorTaxCode;
                if (fTaxAmount > 0 && !sTaxCode) {
                    oModel.setProperty("/appState/isBusy", false);
                    oModel.setProperty("/initiatorValidation", {
                        visible: true,
                        state: "Error",
                        text: "Tax Code is required when a Tax Amount is entered. Please select a Tax / VAT Code."
                    });
                    return;
                }


                // Line items check
                if (aUserLines.length === 0) {
                    addMsg("E", "ZFI", "004", "At least one G/L line item must be entered.");
                }

                aUserLines.forEach(function (line, idx) {
                    if (!line.glAccount) {
                        addMsg("E", "ZFI", "005", "Line " + (idx + 2) + ": G/L Account is missing.");
                    }
                    if (!line.amountDC || parseFloat(line.amountDC) === 0) {
                        addMsg("E", "ZFI", "006", "Line " + (idx + 2) + ": Amount must be greater than zero.");
                    }
                });

                // Balance check
                var oBalance = oModel.getProperty("/initiatorBalance");
                if (!oBalance.isBalanced) {
                    addMsg("E", "ZFI", "007", "Document is not in balance. Net difference: " + oBalance.netAmount);
                }

                oModel.setProperty("/appState/isBusy", false);

                var bHasError = aMessages.some(function (m) { return m.type === "E"; });
                if (bHasError) {
                    oModel.setProperty("/initiatorValidation", {
                        visible: true,
                        state: "Error",
                        text: "Validation failed with " + aMessages.length + " error(s)."
                    });
                    MessageBox.error("Validation failed. Please review the highlighted errors.");
                } else {
                    oModel.setProperty("/initiatorValidation", {
                        visible: true,
                        state: "Success",
                        text: "All checks passed successfully. Document is ready to post or submit."
                    });
                    MessageToast.show("Validation successful!");
                }
            }, 500);
        },

        // ─────────────────────────────────────────────────────────────────────
        // Action Handlers (Save, Submit, Reset)
        // ─────────────────────────────────────────────────────────────────────

        onSaveDraft: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/appState/isBusy", true);

            setTimeout(function () {
                oModel.setProperty("/appState/isBusy", false);
                oModel.setProperty("/workflow/status", Constants.WORKFLOW_STATUS.DRAFT);
                oModel.setProperty("/workflow/statusState", "Warning");
                oModel.setProperty("/workflow/intercoRef", "IC-2026-" + Math.floor(1000 + Math.random() * 9000));
                MessageToast.show("Draft saved successfully.");
            }, 600);
        },

        onSubmitWorkflow: function () {
            var oModel   = this.getView().getModel();
            var oBalance = oModel.getProperty("/initiatorBalance");
            console.log("Header:", oModel.getProperty("/headerData"));
        console.log("Initiator Lines:", oModel.getProperty("/initiatorLines"));

            if (!oBalance.isBalanced) {
                MessageBox.error("Cannot submit: Document debits and credits must balance.");
                return;
            }

            MessageBox.confirm("Submit this intercompany document for posting in SAP?", {
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) { return; }

                    oModel.setProperty("/appState/isBusy", true);

                    var oHeader = oModel.getProperty("/headerData");
                    var aLines  = oModel.getProperty("/initiatorLines") || [];
                    console.log("Header for Submit:", oHeader);
console.log("Lines for Submit:", aLines);

                    MasterDataService.submitIntercoDocument(oHeader, aLines)
                        .then(function (oResult) {
                            oModel.setProperty("/appState/isBusy", false);
                            oModel.setProperty("/appState/isHeaderEditable", false);
                            oModel.setProperty("/appState/isRecipientEditable", true);
                            oModel.setProperty("/workflow/status", Constants.WORKFLOW_STATUS.SUBMITTED);
                            oModel.setProperty("/workflow/statusState", "Success");
                            oModel.setProperty("/workflow/intercoRef", oResult.accountingdocument_temp || "POSTED");
                            MessageBox.success(
                                "Intercompany document posted successfully in SAP.\n\n" +
                                "Document reference: " + (oResult.accountingdocument_temp || "—")
                            );
                        })
                        .catch(function (oError) {
                            oModel.setProperty("/appState/isBusy", false);
                            MessageBox.error(
                                "Submission failed:\n\n" +
                                (oError && oError.message ? oError.message : "An unexpected error occurred.")
                            );
                        });
                }
            });
        },

        onResetForm: function () {
            var that = this;
            MessageBox.warning("Are you sure you want to reset the entire form?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that._initModel();
                        that._loadReferenceData();
                        MessageToast.show("Form has been reset.");
                    }
                }
            });
        },

        onCreateNew: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/appState/isEditMode", true);
            oModel.setProperty("/appState/isHeaderEditable", true);
        },

        onCancel: function () {
            var that = this;
            MessageBox.warning("Discard changes and return to display mode?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that._initModel();
                        that._loadReferenceData();
                    }
                }
            });
        },

        onDeleteDraft: function () {
            var that = this;
            MessageBox.warning("Delete this draft? This cannot be undone.", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that._initModel();
                        that._loadReferenceData();
                        MessageToast.show("Draft deleted.");
                    }
                }
            });
        },

        onSubmitToRecipient: function () {
            this.onSubmitWorkflow();
        },

        onPostDocument: function () {
            MessageBox.information("Post");
        },

        onSubmitToApprove: function () {
            MessageBox.information("Submit to Approve ");
        }

    });
});