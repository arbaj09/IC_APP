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
                // Load user default CC only after company codes are ready so
                // _resolveCC() can look up the name without returning null.
                that._loadUserDefaultCC();
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
                    documentTypeCode: "",
                    taxInvoiceRequired: false,
                    taxInvoiceNumber: "",
                    taxInvoiceDate: "",
                    taxInvoiceDescription: "",
                    taxVATTreatment: Constants.DEFAULT.VAT_TREATMENT,

                    initiatorCC: Constants.DEFAULT.INITIATOR_CC,
                    initiatorCCName: "Madiba Holdings (Pty) Ltd",
                    initiatorBP: "",
                    recipientBP: "",
                    recipientBPName: "",
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
                    icTransactionType: Constants.DEFAULT.IC_TX_TYPE,
                    totalIntercoAmount: "",

                    initiatorTaxCode: "",
                    initiatorTaxAmount: "0.00",
                    initiatorCountry: "ZA (T001-LAND1 for " + Constants.DEFAULT.INITIATOR_CC + ")",
                    recipientTaxCode: "",
                    recipientTaxAmount: "0.00",
                    recipientCountry: "— (derived from Recipient CC)",
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

                workflow: {
                    status: Constants.WORKFLOW_STATUS.DRAFT,
                    statusState: "Warning",
                    intercoRef: "[NEW — assigned on save]"
                },

                appState: {
                    isBusy: false
                },

                referenceData: {
                    companyCodes:   [],
                    taxCodes:       [],
                    closedPeriods:  [],
                    documentTypes:  []
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
            var sTxType = [
                Constants.TRANSACTION_TYPE.AR,
                Constants.TRANSACTION_TYPE.AP,
                Constants.TRANSACTION_TYPE.ACCRUAL
            ][iIdx];
            oModel.setProperty("/headerData/transactionType", sTxType);
            oModel.setProperty("/headerData/transactionTypeIndex", iIdx);
            this._deriveDocumentType(sTxType);
            this._syncBPClearingLine();
        },

        _deriveDocumentType: function (sTxType) {
            var sCode = sTxType === Constants.TRANSACTION_TYPE.ACCRUAL
                ? Constants.DOCUMENT_TYPE.IA
                : Constants.DOCUMENT_TYPE.IC;
            this.getView().getModel().setProperty("/headerData/documentType",
                this.getI18nText("documentType." + sCode));
        },

        onTaxInvoiceCheck: function () {
            // Visibility is expression-bound; no extra logic needed here.
        },

        // ─────────────────────────────────────────────────────────────────────
        // User Default Company Code
        // ─────────────────────────────────────────────────────────────────────

        _loadUserDefaultCC: function () {
            var oModel = this.getView().getModel();

            // ── Deployed on SAP Fiori Launchpad (BTP / S/4HANA Public Cloud) ──
            // sap.ushell is injected by the Fiori Launchpad shell at runtime.
            // It is NOT available when running locally via http-server.
            if (!sap.ushell || !sap.ushell.Container) {
                return;
            }

            // Step 1: read the logged-in user's SAP user ID from the shell
            var sUserId = sap.ushell.Container.getService("UserInfo").getId();
            if (!sUserId) { return; }

            // Step 2: call the standard S/4HANA user-parameter OData V2 service.
            // Parameter ID "BUK" stores the user's default company code (set in
            // SU3 / My Settings → Default Values in S/4HANA Public Cloud).
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
                // No error handler — silent fail, user enters CC manually
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

            // Clear derived BPs — they depend on the initiator CC and must be re-derived
            oModel.setProperty("/headerData/initiatorBP", "");
            oModel.setProperty("/headerData/recipientBP", "");
            oModel.setProperty("/headerData/recipientBPName", "");
            oModel.setProperty("/headerData/partyValidationVisible", false);

            this._propagateTradingPartner();
            this._syncBPClearingLine();
            this._validateParties();

            // Auto-derive BPs immediately if recipient CC is already set
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

            Promise.all([
                MasterDataService.getBusinessPartners(sIniCC, sRecCC, sTxType),
                MasterDataService.getReverseBP(sRecCC, sIniCC)
            ]).then(function (aResults) {
                var aForward = aResults[0];
                var oReverse = aResults[1];

                if (!aForward.length) {
                    MessageToast.show("No intercompany relationship found between " + sIniCC + " and " + sRecCC + ".");
                    return;
                }

                var oFwd = aForward[0];
                oModel.setProperty("/headerData/recipientBP", oFwd.bp);
                oModel.setProperty("/headerData/recipientBPName", oFwd.bpName);
                oModel.setProperty("/headerData/initiatorBP", oReverse ? oReverse.konts : "—");

                that._validateParties();
                that._syncBPClearingLine();
                that._propagateTradingPartner();
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

                // Load only if not yet fetched
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
        // Document Details
        // ─────────────────────────────────────────────────────────────────────

        onDocumentDateChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            this.getView().getModel().setProperty("/headerData/documentDate", sValue);
        },

        onPostingDateChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oModel = this.getView().getModel();
            oModel.setProperty("/headerData/postingDate", sValue);

            // Derive fiscal period from posting date
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

        onTotalAmountChange: function () {
            this._recalculateTax();
            this._syncBPClearingLine();
            this._recalculateBalance();
        },

        // ─────────────────────────────────────────────────────────────────────
        // Tax Details
        // ─────────────────────────────────────────────────────────────────────

        onInitiatorTaxCodeChange: function () {
            this._recalculateTax();
            this._syncBPClearingLine();
            this._recalculateBalance();
        },

        onRecipientTaxCodeChange: function () {
            this._recalculateTax();
        },

        _recalculateTax: function () {
            var oModel = this.getView().getModel();
            var fGross = parseFloat(oModel.getProperty("/headerData/totalIntercoAmount")) || 0;
            var sIniCode = oModel.getProperty("/headerData/initiatorTaxCode") || "";
            var sRecCode = oModel.getProperty("/headerData/recipientTaxCode") || "";

            var aTaxCodes = oModel.getProperty("/referenceData/taxCodes") || [];
            var oIniTax = aTaxCodes.find(function (t) { return t.code === sIniCode; });
            var oRecTax = aTaxCodes.find(function (t) { return t.code === sRecCode; });
            var fIniRate = oIniTax ? oIniTax.rate : 0;
            var fRecRate = oRecTax ? oRecTax.rate : 0;

            var fIniTax = fGross > 0 ? (fGross * fIniRate / (1 + fIniRate)) : 0;
            var fRecTax = fGross > 0 ? (fGross * fRecRate / (1 + fRecRate)) : 0;

            oModel.setProperty("/headerData/initiatorTaxAmount", fIniTax.toFixed(2));
            oModel.setProperty("/headerData/recipientTaxAmount", fRecTax.toFixed(2));

            // Build tax calc table rows
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
            // Renumber
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

            var sTxType = oModel.getProperty("/headerData/transactionType");
            var sRecipientBP = oModel.getProperty("/headerData/recipientBP") || "—";
            var sRecipientCC = oModel.getProperty("/headerData/recipientCC") || "—";
            var fGross = parseFloat(oModel.getProperty("/headerData/totalIntercoAmount")) || 0;
            var fTaxAmt = parseFloat(oModel.getProperty("/headerData/initiatorTaxAmount")) || 0;
            var sIniTaxCode = oModel.getProperty("/headerData/initiatorTaxCode") || "";

            aLines[0].glAccount = sRecipientBP;
            aLines[0].businessPartner = sRecipientBP;
            aLines[0].tradingPartner = sRecipientCC;
            aLines[0].amountDC = (fGross - fTaxAmt).toFixed(2);
            aLines[0].taxCode = sIniTaxCode;
            aLines[0].debitCredit = sTxType === Constants.TRANSACTION_TYPE.AP
                ? Constants.DC_INDICATOR.CREDIT
                : Constants.DC_INDICATOR.DEBIT;

            oModel.setProperty("/initiatorLines", aLines);
            this._recalculateBalance();
        },

        _propagateTradingPartner: function () {
            var oModel = this.getView().getModel();
            var aLines = oModel.getProperty("/initiatorLines") || [];
            var sRecCC = oModel.getProperty("/headerData/recipientCC") || "";
            aLines.forEach(function (oLine) { oLine.tradingPartner = sRecCC; });
            oModel.setProperty("/initiatorLines", aLines);
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

                if (!aUserLines.length) {
                    addMsg(Constants.MSG_TYPE.ERROR, Constants.MSG_CLASS.ZFI, "E001", "At least one GL offset line is required before submission.");
                }

                var oBalance = oModel.getProperty("/initiatorBalance");
                if (Math.abs(parseFloat(oBalance.netAmount)) >= Constants.BALANCE_TOLERANCE) {
                    addMsg(Constants.MSG_TYPE.ERROR, Constants.MSG_CLASS.F5, "702",
                        "Document not in balance — net: " + oBalance.netAmount +
                        ". Debits and Credits must sum to zero.");
                }

                var oSysLine = aLines[0];
                if (!oSysLine || !oSysLine.glAccount || oSysLine.glAccount === "—") {
                    addMsg(Constants.MSG_TYPE.ERROR, Constants.MSG_CLASS.F5, "003", "BP clearing line GL account not determined. Check party setup and T001U.");
                }

                if (!oSysLine || parseFloat(oSysLine.amountDC) === 0) {
                    addMsg(Constants.MSG_TYPE.ERROR, Constants.MSG_CLASS.F5, "704", "BP clearing line amount is zero. Enter Total Interco Amount on Header tab.");
                }

                aUserLines.forEach(function (oLine, idx) {
                    var iLineNo = idx + 2;
                    if (!oLine.glAccount || !oLine.glAccount.trim()) {
                        addMsg(Constants.MSG_TYPE.ERROR, Constants.MSG_CLASS.F5, "001", "Line " + iLineNo + ": GL Account is required.");
                    }
                    if (!parseFloat(String(oLine.amountDC).replace(/[^0-9.\-]/g, ""))) {
                        addMsg(Constants.MSG_TYPE.WARNING, Constants.MSG_CLASS.F5, "067", "Line " + iLineNo + ": Amount is zero — confirm this is intentional.");
                    }
                    if (!oLine.itemText || !oLine.itemText.trim()) {
                        addMsg(Constants.MSG_TYPE.WARNING, Constants.MSG_CLASS.ZFI, "W002", "Line " + iLineNo + ": Item Text is missing (mandatory per posting guidelines).");
                    }
                });

                var sPeriodState = oModel.getProperty("/headerData/periodStatusState");
                if (sPeriodState === "Error") {
                    addMsg(Constants.MSG_TYPE.ERROR, Constants.MSG_CLASS.F5, "201", "Posting period is closed. Period must be open to post.");
                }

                var sIniCC = (oModel.getProperty("/headerData/initiatorCC") || "").trim();
                if (!sIniCC) {
                    addMsg(Constants.MSG_TYPE.ERROR, Constants.MSG_CLASS.F5, "052", "Initiator Company Code is blank. Enter it on the Header tab.");
                }

                var nErrors = aMessages.filter(function (m) { return m.type === Constants.MSG_TYPE.ERROR; }).length;
                var nWarnings = aMessages.filter(function (m) { return m.type === Constants.MSG_TYPE.WARNING; }).length;

                if (!nErrors && !nWarnings) {
                    addMsg(Constants.MSG_TYPE.SUCCESS, Constants.MSG_CLASS.F5, "000", "Simulation successful — no errors or warnings. Document may be posted.");
                } else if (!nErrors) {
                    addMsg(Constants.MSG_TYPE.SUCCESS, Constants.MSG_CLASS.F5, "000", "Simulation passed with " + nWarnings + " warning(s) — review before submitting.");
                }

                oModel.setProperty("/appState/isBusy", false);

                // Build summary text
                var sSummary;
                var sState;
                if (nErrors > 0) {
                    sSummary = "Validation failed — " + nErrors + " error(s). Resolve all errors before submitting.";
                    sState = "Error";
                } else if (nWarnings > 0) {
                    sSummary = "Validated with " + nWarnings + " warning(s). Review warnings, then submit.";
                    sState = "Warning";
                } else {
                    sSummary = "Validation passed — SAP simulation returned no errors. Transaction may be submitted.";
                    sState = "Success";
                }
                oModel.setProperty("/initiatorValidation/visible", true);
                oModel.setProperty("/initiatorValidation/state", sState);
                oModel.setProperty("/initiatorValidation/text", sSummary);

                // Show detail in MessageBox
                var sDetail = aMessages.map(function (m) {
                    var sPrefix = m.type === Constants.MSG_TYPE.ERROR ? "✗ Error" : m.type === Constants.MSG_TYPE.WARNING ? "! Warning" : "✓ Info";
                    return sPrefix + " [" + m.msgClass + " " + m.msgNum + "]: " + m.text;
                }).join("\n");

                if (nErrors > 0) {
                    MessageBox.error(sDetail, { title: "SAP JE API — Validate (Simulate)" });
                } else if (nWarnings > 0) {
                    MessageBox.warning(sDetail, { title: "SAP JE API — Validate (Simulate)" });
                } else {
                    MessageBox.success(sDetail, { title: "SAP JE API — Validate (Simulate)" });
                }

            }, 1200);
        },

        // ─────────────────────────────────────────────────────────────────────
        // Action Bar
        // ─────────────────────────────────────────────────────────────────────

        onDeleteDraft: function () {
            var that = this;
            MessageBox.confirm("Delete this draft? All unsaved data will be lost.", {
                title: "Delete Draft",
                actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.DELETE,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.DELETE) {
                        that._initModel();
                        MessageToast.show("Draft deleted.");
                    }
                }
            });
        },

        onCancel: function () {
            var that = this;
            MessageBox.confirm("Cancel and discard all changes?", {
                title: "Cancel",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        that._initModel();
                        MessageToast.show("Changes discarded.");
                    }
                }
            });
        },

        onSaveDraft: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/appState/isBusy", true);
            setTimeout(function () {
                oModel.setProperty("/appState/isBusy", false);
                MessageToast.show("Draft saved successfully.");
            }, 1500);
        },

        onSubmitToRecipient: function () {
            var oModel = this.getView().getModel();
            var sIniCC = (oModel.getProperty("/headerData/initiatorCC") || "").trim();
            var sRecBP = (oModel.getProperty("/headerData/recipientBP") || "").trim();
            var sRef = (oModel.getProperty("/headerData/reference") || "").trim();
            var sHdrText = (oModel.getProperty("/headerData/headerText") || "").trim();
            var fAmt = parseFloat(oModel.getProperty("/headerData/totalIntercoAmount")) || 0;
            var oBalance = oModel.getProperty("/initiatorBalance");
            var aLines = oModel.getProperty("/initiatorLines") || [];
            var aUserLines = aLines.filter(function (l) { return !l.isSystemLine; });

            if (!sIniCC) { MessageBox.error("Initiator Company Code is required."); return; }
            if (!sRecBP) { MessageBox.error("Recipient Business Partner is required. Use F4 on Party Details."); return; }
            if (!sRef) { MessageBox.error("Reference is required (Header tab)."); return; }
            if (!sHdrText) { MessageBox.error("Header Text is required (Header tab)."); return; }
            if (!fAmt) { MessageBox.error("Total Interco Amount must be greater than zero."); return; }
            if (!aUserLines.length) { MessageBox.error("At least one GL offset line is required (GL Coding — Initiator tab)."); return; }
            if (!oBalance.isBalanced) { MessageBox.error("GL coding is not balanced (Dr ≠ Cr). Correct before submitting."); return; }

            oModel.setProperty("/appState/isBusy", true);
            setTimeout(function () {
                oModel.setProperty("/appState/isBusy", false);
                oModel.setProperty("/workflow/status", Constants.WORKFLOW_STATUS.SUBMITTED);
                oModel.setProperty("/workflow/statusState", "Success");
                oModel.setProperty("/workflow/intercoRef", "IC-2026-00" + Math.floor(Math.random() * 900 + 100));
                MessageBox.success(
                    "Transaction submitted to Recipient successfully.\n" +
                    "Interco Ref: " + oModel.getProperty("/workflow/intercoRef") +
                    "\nA workflow notification has been sent to the Recipient.",
                    { title: "Submitted" }
                );
            }, 2000);
        }

    });
});
