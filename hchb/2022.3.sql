IF NOT EXISTS (
		SELECT 1
		FROM SYS.PROCEDURES prc
		JOIN SYS.SCHEMAS sch ON sch.schema_id = prc.schema_id
		WHERE prc.NAME = 'usp_vendorSendSHPOASIS'
			AND sch.NAME = 'dbo'
		)
BEGIN
	EXEC dbo.SP_EXECUTESQL @stmt= N'CREATE PROC dbo.usp_vendorSendSHPOASIS AS SELECT 1;';
END
GO

ALTER PROCEDURE [dbo].[usp_vendorSendSHPOASIS] (
	@startDate DATETIME = NULL
	,@endDate DATETIME = NULL
	,@branches VARCHAR(8000) = NULL
	,@excludeBranches VARCHAR(8000) = NULL
	,@specific_ceoid INT = NULL
	,@specific_xml XML OUT
	)
AS

--===========================================================================================        
--History:    RR  12/15/16 - Added Patient Program in the custom field        
--    AC 7/14/17 - Modified Patient Program selection to consider effective dates        
--    RR 10/31/18 - US 133217 - Continue Sending Data excluded in OASIS-D (Planned Hospitalization, Inpatient Diagnosis Codes,Inpatient Procedure Codes,Discharge Status Codes,Patient Telephone)         
--    NS 01/29/2019  Added a filter for a_id 910538 and added a field cevaa_ceva_aid to #AssessItems         
--    KT - 02/26/2019 - DBLS_INTERFACES_PROD.INTERFACES_PROD.dbo.SHP_OASIS_STAGING   
--    NS,EJ - 04/30/2019 - US165060-resolved gatekeeper comments    
--	  AC - 01/12/2020 - Added fields for diagnosis per PDGM period, refactored for latest build rules 
--    AC - 01/28/2020 - Removed non-nullable requirement from all temp table fields to correct bug
--    OM Sharma - 11/16/2021 - Updated code to populate NON PDGM payors related diagnosis VSTS-333618
--    Om Sharma - 03/11/2022 - Updated code to sort Diagnosis based on 485 and Add On Orders - VSTS-348814
--    Om Sharma - 04/12/2022 - Updated code to sort Diagnosis based on ROC,485 and Add On Orders. Find more details in VSTS-355752
--============================================================================================  
BEGIN
	SET NOCOUNT ON
	SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED

	BEGIN TRY
		DECLARE @VendorID INT = 70
			,@setEndDate BIT = 0
			,@customerDefinedKey VARCHAR(500)
			,@customerDefinedValues VARCHAR(1000)
			,@sendPriorInpatientFacility VARCHAR(8000)
		DECLARE @tempbranches TABLE (branchcodelist VARCHAR(8000) NULL)
		DECLARE @tempexcludebranches TABLE (excludebranchcodelist VARCHAR(8000) NULL)

		DECLARE @onlyAllowBranches TABLE(
			branch_code VARCHAR(3) NULL
		)

		create table #ceoa (
			ceoid INT  NULL
			,lastupdate DATETIME  NULL
			)

		create table #ceoh (
			ceoid INT  NULL
			,transdate DATETIME  NULL
			)

		create table #oasisanswers  (
			ceoa_id INT  NULL
			,ceoa_ceoid INT  NULL
			,ceoa_lastupdate DATETIME  NULL
			,ceoa_omid INT  NULL
			,ceoa_oasisanswer VARCHAR(1450) NULL
			,ceoa_answer VARCHAR(1450) NULL
			)

		create table #ceo (
			ceo_id INT NULL
			,ceo_cevid INT NULL
			,ceo_OASIScorrectionnum INT NULL
			,ceo_epiid INT NULL
			,ceo_OASISbody VARCHAR(3500) NULL
			,ceo_OASISInactivation VARCHAR(3500) NULL
			,ceo_HIPPS VARCHAR(5) NULL
			,ceo_HHRG VARCHAR(6) NULL
			,ceo_OASISKey VARCHAR(18) NULL
			,ceo_versioncd2 CHAR(5) NULL
			,ceo_insertdate DATETIME  NULL
			)

		CREATE TABLE #episodes (
			epi_id INT NULL
			,epi_paid INT NULL
			,epi_slid INT NULL
			,epi_branchcode VARCHAR(3) NULL
			,epi_teamid INT  NULL
			,epi_agid INT NULL
			,epi_mrnum VARCHAR(14) NULL
			,epi_ReferralSource VARCHAR(10) NULL
			,epi_ReferralFaId INT NULL
			,epi_phid INT NULL
			,epi_ReferralContact VARCHAR(100) NULL
			,epi_SocDate DATETIME NULL
			,epi_status VARCHAR(15) NULL
			,epi_DcCode CHAR(2) NULL
			)

		CREATE TABLE #oasishistory  (
			ceoh_id INT NULL
			,ceoh_ceoid INT NULL
			,ceoh_transdate DATETIME NULL
			,ceoh_transtype VARCHAR(30) NULL
			)

		CREATE TABLE #cev (
			cev_id INT NULL
			,cev_agid INT NULL
			,cev_ceoid INT NULL
			)

		CREATE TABLE #AssessItems  (
			ceva_id BIGINT NULL
			,ceva_cevid INT NULL
			,ceva_epiid INT NULL
			,ceva_qid INT NULL
			,cevaa_diICDCode VARCHAR(50) NULL
			,cevaa_diICDVersionId VARCHAR(50) NULL
			,cevaa_ICD_CODES_ID INT NULL
			,flag VARCHAR(10) NULL
			,RowNum INT NULL
			,ceo_id INT NULL
			,cevaa_ceva_aid INT NULL
			)

		CREATE TABLE #omidset (
			soatask VARCHAR(10) NULL
			,omid INT NULL
			)

		CREATE TABLE #OFFSET (
			omid INT NULL
			,ovl_VersionCD2 VARCHAR(100) NULL
			,omoffset VARCHAR(100) NULL
			)

			CREATE TABLE #TempEpisodeDiagnoses (
			ced_epiid INT NULL,
			pp_periodnumber INT NULL,
			ceo_id INT NULL,
			ced_diICDCode VARCHAR(50) NULL,
			cdp_SortOrder INT NULL,
			o_otid INT NULL
			)

		CREATE TABLE #EpisodeDiagnoses (
			rownum INT NULL,
			ced_epiid INT NULL,
			pp_periodnumber INT NULL,
			ceo_id INT NULL,
			ced_diICDCode VARCHAR(50) NULL,
			o_otid INT NULL
			)

			CREATE TABLE #TempPDGMEpisodeDiagnoses (
			ced_epiid INT NULL,
			pp_periodnumber INT NULL,
			ceo_id INT NULL,
			ced_diICDCode VARCHAR(50) NULL,
			cdp_SortOrder INT NULL,
			o_otid INT NULL
			)

			CREATE TABLE #TempNonPDGMEpisodeDiagnoses (
			ced_epiid INT NULL,
			pp_periodnumber INT NULL,
			ceo_id INT NULL,
			ced_diICDCode VARCHAR(50) NULL,
			cdp_SortOrder INT NULL,
			o_otid INT NULL
			)

			CREATE TABLE #TempSortedEpisodeDiagnoses (
			rownum INT NULL,
			ced_epiid int NULL,
			ceo_id INT NULL,
			pp_periodnumber int NULL,
			ced_diICDCode VARCHAR(50) NULL,
			o_otid int NULL
			)
			
		CREATE TABLE #MostRecentOrder (
			epi_id INT,
			coa_id INT,
			ot_code CHAR(5)
		)

		CREATE TABLE #MostRecentROC485 (
			epi_id INT,
			coa_id INT,
			isApproved BIT
		)

		CREATE TABLE #resultset (
			servername VARCHAR(100) NULL
			,databasename VARCHAR(100) NULL
			,ceo_id INT NULL
			,ceo_OASIScorrectionnum TINYINT NULL
			,ceo_cevid INT NULL
			,ceo_epiid INT NULL
			,ceo_OASISheader VARCHAR(8000) NULL
			,ceo_OASISbody VARCHAR(8000) NULL
			,ceo_OASIStrailer VARCHAR(8000) NULL
			,ceo_OASISInactivation VARCHAR(8000) NULL
			,ceo_HIPPS VARCHAR(5) NULL
			,ceo_HHRG VARCHAR(6) NULL
			,ceo_OASISKey VARCHAR(18) NULL
			,ceo_versioncd2 CHAR(5) NULL
			,ceo_insertdate DATETIME NULL
			,ceo_lastupdate DATETIME NULL
			,ceo_Clinicain_Name VARCHAR(80) NULL
			,ceo_Case_Manager VARCHAR(80) NULL
			,ceo_Team VARCHAR(15) NULL
			,ceo_status VARCHAR(50) NULL
			,ReferralSource VARCHAR(100) NULL
			,PayerName VARCHAR(100) NULL
			,ProviderId VARCHAR(15) NULL
			,ActivationCode VARCHAR(15) NULL
			,PriorInpatientFacility VARCHAR(8000) NULL
			,CustomerDefined VARCHAR(8000) NULL
			,VendorId VARCHAR(8000) NULL
			,Patient_Telephone VARCHAR(25) NULL
			,Planned_Hospitalization BIT NULL
			,Discharge_Status_Code CHAR(2) NULL
			,Inpatient_Diagnosis_Code_Primary VARCHAR(10) NULL
			,Inpatient_Diagnosis_Code_Other_1 VARCHAR(10) NULL
			,Inpatient_Diagnosis_Code_Other_2 VARCHAR(10) NULL
			,Inpatient_Diagnosis_Code_Other_3 VARCHAR(10) NULL
			,Inpatient_Diagnosis_Code_Other_4 VARCHAR(10) NULL
			,Inpatient_Diagnosis_Code_Other_5 VARCHAR(10) NULL
			,Inpatient_Procedure_Code_Primary VARCHAR(10) NULL
			,Inpatient_Procedure_Code_Other_1 VARCHAR(10) NULL
			,Inpatient_Procedure_Code_Other_2 VARCHAR(10) NULL
			,Inpatient_Procedure_Code_Other_3 VARCHAR(10) NULL
			,Inpatient_Procedure_Code_Other_4 VARCHAR(10) NULL
			,Inpatient_Procedure_Code_Other_5 VARCHAR(10) NULL
			)

		IF @excludeBranches IS NOT NULL
		BEGIN
			INSERT INTO @tempexcludebranches (excludebranchcodelist)
			SELECT StringName
			FROM dbo.fn_SplitStringCLR(@excludeBranches, ',')
		END
		ELSE
		BEGIN
			INSERT INTO @tempexcludebranches (excludebranchcodelist)
			SELECT ''
		END

		IF @branches IS NULL
		BEGIN
			INSERT INTO @onlyAllowBranches (branch_code)
			SELECT DISTINCT asb.asb_branchcode
			FROM dbo.BRANCHES b1
			INNER JOIN dbo.AGENCIES_SERVICELINES_BRANCHES asb ON asb.asb_branchcode = b1.branch_code
			INNER JOIN dbo.AGENCIES a ON asb.asb_agencyid = a.agency_id
				AND asb.asb_slid = 1
			
			EXCEPT
			
			(
				SELECT excludebranchcodelist
				FROM @tempexcludebranches
				)
		END
		ELSE
		BEGIN
			INSERT INTO @tempbranches (branchcodelist)
			SELECT StringName
			FROM dbo.fn_SplitStringCLR(@branches, ',')

			INSERT INTO @onlyAllowBranches (branch_code) (
				SELECT DISTINCT b2.branch_code FROM dbo.BRANCHES b2 INNER JOIN dbo.AGENCIES_SERVICELINES_BRANCHES asb ON asb.asb_branchcode = b2.branch_code INNER JOIN dbo.AGENCIES a ON asb.asb_agencyid = a.agency_id
				AND asb.asb_slid = 1
				)
			
			INTERSECT
			
			(
				SELECT branchcodelist
				FROM @tempbranches
				
				EXCEPT
				
				SELECT excludebranchcodelist
				FROM @tempexcludebranches
				)
		END

		--if no start date specified, use the last execution timestamp  
		IF @startDate IS NULL
		BEGIN
			SELECT @startDate = vd_value
			FROM dbo.VENDOR_DETAILS
			WHERE vd_vid = @VendorID
				AND vd_key = 'LastExecution'
		END

		-- select vd_value FROM dbo.VENDOR_DETAILS WHERE vd_vid = 70 AND vd_key = 'LastExecution' '
		-- update dbo.VENDOR_DETAILS set vd_value = '2018-01-01 08:45:53.177' where vd_vid = 70 AND vd_key = 'LastExecution' 
		-- if still blank, set it to one day ago  
		IF @startDate IS NULL
			OR @startDate = ''
		BEGIN
			SELECT @startDate = GETDATE() - 1
		END

		IF @endDate IS NULL
		BEGIN
			SELECT @endDate = GETDATE()
				,@setEndDate = 1
		END

		IF (@startDate > @endDate)
		BEGIN
			RAISERROR (
					N'Start date specified cannot be later than end date!'
					,16
					,1
					)
		END

		--manage specific ceoid request
		IF @specific_ceoid IS NOT NULL
		BEGIN
			--since a specific ceoid was provided, pick start and end dates that can never happen
			SELECT @startDate = '12/1/2000'

			SELECT @endDate = '1/1/2000'
		END
				-------------------------------------------Get SHP Oasis data -----------------------------------------------------------    

				;

		WITH CTE
		AS (
			SELECT ceoa_id
			FROM dbo.CLIENT_EPISODE_OASIS_ANSWERS
			WHERE (
					ceoa_lastupdate >= @StartDate
					AND ceoa_lastupdate <= @EndDate
					)
			
			UNION
			
			SELECT ceoa_id
			FROM dbo.CLIENT_EPISODE_OASIS_ANSWERS
			WHERE (ceoa_ceoid = @specific_ceoid)
			)
		INSERT INTO #oasisanswers
		(
			ceoa_id
			,ceoa_ceoid
			,ceoa_lastupdate
			,ceoa_omid
			,ceoa_OASISAnswer
			,ceoa_answer
		)
		SELECT c.ceoa_id
			,c.ceoa_ceoid
			,c.ceoa_lastupdate
			,c.ceoa_omid
			,c.ceoa_OASISAnswer
			,c.ceoa_answer
		FROM cte AS cte
		INNER JOIN dbo.CLIENT_EPISODE_OASIS_ANSWERS AS c ON c.ceoa_id = cte.ceoa_id

		INSERT INTO #ceoa
		(
			ceoid,
			lastupdate
		)
		SELECT ceoa_ceoid
			,max(ceoa_lastupdate)
		FROM #oasisanswers
		GROUP BY ceoa_ceoid;

		WITH cte
		AS (
			SELECT DISTINCT RANK() OVER (
					PARTITION BY ceo.ceo_cevid ORDER BY ceo_id DESC
					) AS ceorank
				,ceo.ceo_id
			FROM dbo.CLIENT_EPISODE_OASIS ceo
			WHERE EXISTS (
					SELECT 1
					FROM #ceoa ceoa
					WHERE ceoa.ceoid = ceo.ceo_id
					)
			)
		INSERT INTO #ceo
		(
			ceo_id
			,ceo_cevid
			,ceo_OASIScorrectionnum
			,ceo_epiid
			,ceo_OASISbody
			,ceo_OASISInactivation
			,ceo_HIPPS
			,ceo_HHRG
			,ceo_OASISKey
			,ceo_versioncd2
			,ceo_insertdate
		)
		SELECT ceo.ceo_id
			,ceo.ceo_cevid
			,ceo.ceo_OASIScorrectionnum
			,ceo.ceo_epiid
			,ceo.ceo_OASISbody
			,ceo.ceo_OASISInactivation
			,ceo.ceo_HIPPS
			,ceo.ceo_HHRG
			,ceo.ceo_OASISKey
			,ceo.ceo_versioncd2
			,ceo.ceo_insertdate
		FROM CTE AS cte
		INNER JOIN dbo.CLIENT_EPISODE_OASIS ceo ON cte.ceo_id = ceo.ceo_id
		WHERE cte.ceorank = 1		
		
		INSERT INTO #episodes (
			epi_id
			,epi_paid
			,epi_slid
			,epi_branchcode
			,epi_teamid
			,epi_agid
			,epi_mrnum
			,epi_ReferralSource
			,epi_ReferralFaId
			,epi_phid
			,epi_ReferralContact
			,epi_SocDate
			,epi_status
			,epi_DcCode
			)
		SELECT epi_id
			,epi_paid
			,epi_slid
			,epi_branchcode
			,epi_teamid
			,epi_agid
			,epi_mrnum
			,epi_ReferralSource
			,epi_ReferralFaId
			,epi_phid
			,epi_ReferralContact
			,epi_SocDate
			,epi_status
			,epi_DcCode
		FROM dbo.CLIENT_EPISODES_ALL
		WHERE epi_slid = 1
			AND EXISTS (
				SELECT 1
				FROM #ceo
				WHERE epi_id = ceo_epiid
				)

		INSERT INTO #oasishistory (
			ceoh_id
			,ceoh_ceoid
			,ceoh_transdate
			,ceoh_transtype
			)
		SELECT ceoh_id
			,ceoh_ceoid
			,ceoh_transdate
			,ceoh_transtype
		FROM dbo.CLIENT_EPISODE_OASIS_HISTORY
		WHERE EXISTS (
				SELECT 1
				FROM #ceoa
				WHERE ceoid = ceoh_ceoid
				)

		INSERT INTO #cev (
			cev_id
			,cev_agid
			,cev_ceoid
			)
		SELECT DISTINCT ceva.cev_id
			,ceva.cev_agid
			,ceo.ceo_id
		FROM dbo.CLIENT_EPISODE_VISITS_ALL ceva
		INNER JOIN #ceo ceo ON ceva.cev_id = ceo.ceo_cevid
		WHERE ceva.cev_deleted = CAST(0 AS BIT)

		IF EXISTS (
				SELECT 1
				FROM dbo.VENDORS_SERVICELINES_BRANCHES
				WHERE vsb_vid = @VendorID
				)
		BEGIN
			DELETE c1
			FROM #ceoa c1
			INNER JOIN #ceo o1 ON o1.ceo_id = c1.ceoid
			INNER JOIN #episodes e1 ON e1.epi_id = o1.ceo_epiid
				AND e1.epi_status <> 'DELETED'
			WHERE NOT EXISTS (
					SELECT 1
					FROM dbo.VENDORS_SERVICELINES_BRANCHES
					WHERE vsb_vid = @VendorID
						AND vsb_slid = epi_slid
						AND (
							vsb_branchcode = 'ALL'
							OR vsb_branchcode = epi_branchcode
							)
					)
		END

		IF EXISTS (
				SELECT 1
				FROM @onlyAllowBranches
				)
		BEGIN
			DELETE c1
			FROM #ceoa c1
			INNER JOIN #ceo o1 ON o1.ceo_id = c1.ceoid
			INNER JOIN #episodes e1 ON e1.epi_id = o1.ceo_epiid
				AND e1.epi_slid = 1
				AND e1.epi_status <> 'DELETED'
			WHERE NOT EXISTS (
					SELECT 1
					FROM @onlyAllowBranches
					WHERE epi_branchcode = branch_code
					)
		END

		BEGIN TRAN

		INSERT INTO #ceoh
		(
			ceoid,
			transdate
		)
		SELECT oh.ceoh_ceoid
			,MAX(oh.ceoh_transdate)
		FROM #oasishistory oh
		INNER JOIN #ceoa ceoa ON ceoa.ceoid = oh.ceoh_ceoid
		GROUP BY oh.ceoh_ceoid

		INSERT INTO #AssessItems (
			ceva_id
			,ceva_cevid
			,ceva_epiid
			,ceva_qid
			,ceo_id
			,cevaa_ceva_aid
			)
		SELECT ceva.ceva_id
			,ceva.ceva_cevid
			,ceva.ceva_epiid
			,ceva.ceva_qid
			,cev.cev_ceoid
			,cevaa.cevaa_ceva_aid
		FROM dbo.CLIENT_EPISODE_VISIT_ASSESSITEMS ceva
		INNER JOIN dbo.CLIENT_EPISODE_VISIT_ASSESSITEMS_ANSWERS cevaa ON ceva.ceva_id = cevaa.cevaa_ceva_id
		INNER JOIN #cev cev ON cev.cev_id = ceva.ceva_cevid
		WHERE ceva.ceva_qid IN (
				929105
				,910007
				)

		INSERT INTO #AssessItems (
			ceva_id
			,ceva_cevid
			,ceva_epiid
			,ceva_qid
			,cevaa_diICDCode
			,cevaa_diICDVersionId
			,cevaa_ICD_CODES_ID
			,RowNum
			,ceo_id
			)
		SELECT ceva.ceva_id
			,ceva.ceva_cevid
			,ceva.ceva_epiid
			,ceva.ceva_qid
			,cevaa.cevaa_diICDCode
			,cevaa.cevaa_diICDVersionId
			,cevaa.cevaa_ICD_CODES_ID
			,ROW_NUMBER() OVER (
				PARTITION BY ceva.ceva_id ORDER BY cevaa.cevaa_ICD_CODES_ID
				)
			,ceo.ceo_id
		FROM dbo.CLIENT_EPISODE_VISIT_ASSESSITEMS ceva
		INNER JOIN dbo.CLIENT_EPISODE_VISIT_ASSESSITEMS_ANSWERS_ICD_CODES cevaa ON ceva.ceva_id = cevaa.cevaa_ceva_id
		INNER JOIN #cev cev ON cev.cev_id = ceva.ceva_cevid
		INNER JOIN #ceo ceo ON cev.cev_id = ceo.ceo_cevid
		WHERE ceva.ceva_qid IN (
				921011
				,910008
				)

		UPDATE a
		SET a.flag = 'PH' --Planned Hospitalization
		FROM #AssessItems a
		WHERE a.ceva_qid = 929105

		UPDATE a
		SET a.flag = 'DC' --Inpatient Discharge Code
		FROM #AssessItems a
		WHERE a.ceva_qid = 921011

		UPDATE a
		SET a.flag = 'PC' --Inpatient Procedure Code
		FROM #AssessItems a
		WHERE a.ceva_qid IN (
				910008
				,910007
				)

		COMMIT TRAN
		
		IF EXISTS (
				SELECT 1
				FROM #ceoa
				)
		BEGIN
			BEGIN TRAN

			INSERT INTO #resultset (
				servername
				,databasename
				,ceo_id
				,ceo_OASIScorrectionnum
				,ceo_cevid
				,ceo_epiid
				,ceo_OASISheader
				,ceo_OASISbody
				,ceo_OASIStrailer
				,ceo_OASISInactivation
				,ceo_HIPPS
				,ceo_HHRG
				,ceo_OASISKey
				,ceo_versioncd2
				,ceo_insertdate
				,ceo_lastupdate
				,ceo_Clinicain_Name
				,ceo_Case_Manager
				,ceo_Team
				,ceo_status
				,ReferralSource
				,PayerName
				,ProviderId
				,ActivationCode
				,PriorInpatientFacility
				,CustomerDefined
				,VendorId
				,Patient_Telephone
				,Discharge_Status_Code
				,Planned_Hospitalization
				)
			SELECT DISTINCT @@SERVERNAME
				,DB_NAME()
				,ceo.ceo_id
				,ceo.ceo_OASIScorrectionnum
				,ceo.ceo_cevid
				,ceo.ceo_epiid
				,'ceo_OASISheader'
				,ceo.ceo_OASISbody
				,'ceo_OASIStrailer'
				,ceo.ceo_OASISInactivation
				,ceo.ceo_HIPPS
				,ceo.ceo_HHRG
				,ceo.ceo_OASISKey
				,ceo.ceo_versioncd2
				,ceo.ceo_insertdate
				,getdate()
				,ceo_Clinicain_Name = w2.wkr_fullname
				,ceo_Case_Manager = w1.wkr_fullname
				,ceo_Team = ce1.epi_branchcode + ' -' + t.team_name
				,ceo_status = ceoh2.ceoh_transtype
				,NULL
				,NULL
				,NULL
				,NULL
				,NULL
				,NULL
				,NULL
				,LEFT(replace(replace(replace(replace(cesl.cesl_phone, '(', ''), ')', ''), '-', ''), ' ', ''), 10) AS cesl_phone
				,ce1.epi_dcCode
				,0
			FROM #ceoa ceoa
			INNER JOIN #ceoh ceoh ON ceoh.ceoid = ceoa.ceoid
			INNER JOIN #ceo ceo ON ceo.ceo_id = ceoa.ceoid
			INNER JOIN #oasishistory ceoh2 ON ceoh2.ceoh_ceoid = ceoh.ceoid
				AND ceoh2.ceoh_transdate = ceoh.transdate
			INNER JOIN #cev cev ON cev.cev_id = ceo.ceo_cevid
			INNER JOIN #episodes ce1 ON ce1.epi_id = ceo.ceo_epiid
			LEFT JOIN dbo.TEAMS t ON t.team_id = ce1.epi_teamid
			LEFT JOIN dbo.Workers w1 ON ce1.epi_agid = w1.wkr_id
			LEFT JOIN dbo.Workers w2 ON cev.CEV_AGID = w2.wkr_id
			LEFT JOIN dbo.CLIENT_EPISODE_SERVICE_LOCATIONS cesl ON cesl.cesl_epiid = ce1.epi_id
			WHERE ce1.epi_status <> 'DELETED'

		--Get most Recent Orders for each episode
		INSERT INTO #MostRecentOrder
		(
		    epi_id,
		    coa_id,
		    ot_code
		)
		SELECT TOP (1) WITH TIES e.ceo_epiid,
			coa.o_id,
			ot.ot_code
		FROM #resultset e
			JOIN dbo.CLIENT_ORDERS_ALL coa ON e.ceo_epiid = coa.o_epiid
			JOIN dbo.ORDER_TYPES ot ON coa.o_otid = ot.ot_id
		ORDER BY ROW_NUMBER() OVER (PARTITION BY e.ceo_epiid ORDER BY coa.o_DateEntered DESC)
		
		--Get most Recent ROC or 485 Orders for each episode
		INSERT INTO #MostRecentROC485
		(
		    epi_id,
		    coa_id,
			isApproved
		)
		SELECT TOP (1) WITH TIES e.ceo_epiid,
			coa.o_id,
			CASE 
				WHEN coa.o_dateapproved IS NULL THEN 0
				ELSE 1
			END
		FROM #resultset e
			JOIN dbo.CLIENT_ORDERS_ALL coa ON e.ceo_epiid = coa.o_epiid
			JOIN dbo.ORDER_TYPES ot ON coa.o_otid = ot.ot_id
		WHERE ot.ot_code IN ('ROC', '485')
		ORDER BY ROW_NUMBER() OVER (PARTITION BY e.ceo_epiid ORDER BY coa.o_DateEntered DESC)
			
			------- Selecting all NON PDGM records -------
			/* 
			 VSTS - 355752. The diagnosis is sorted/prioritized based on order type. 
				1) ROC
				2) 485
				3) Addon
			*/
			INSERT INTO #TempNonPDGMEpisodeDiagnoses
			(
			    ced_epiid,
			    pp_periodnumber,
			    ceo_id,
			    ced_diICDCode,
			    cdp_SortOrder,
				o_otid
			)
			SELECT 
			qry.cefs_epiid,qry.pp_periodnumber,qry.ceo_id,qry.cdp_diICDCode,qry.cdp_SortOrder,qry.o_otid   FROM
			(
			SELECT 
			ROW_NUMBER() OVER (PARTITION BY cdp.cdp_diICDCode,rs.ceo_epiid,cdp.cdp_SortOrder ORDER BY CASE WHEN ot.ot_code ='ROC' THEN 1 WHEN ot.ot_code ='485' THEN 2 ELSE 3 END,cdp.cdp_SortOrder) rnum_dup,
			cefs.cefs_epiid,
			1 [pp_periodnumber],
			cdp.cdp_diICDCode
			,rs.ceo_id
			,cdp.cdp_SortOrder
			,CASE WHEN ot.ot_code ='ROC' THEN 1
			WHEN ot.ot_code ='485' THEN 2
			ELSE 3
			END [o_otid]
			FROM
			 dbo.CLIENT_EPISODE_FS(NOLOCK) AS cefs 
			JOIN dbo.CLIENT_DIAGNOSES_AND_PROCEDURES(NOLOCK) AS cdp ON cdp.cdp_epiid = cefs.cefs_epiid
			INNER JOIN #resultset rs ON cefs.cefs_epiid = rs.ceo_epiid
			JOIN #MostRecentOrder mro ON rs.ceo_epiid = mro.epi_id
			JOIN #MostRecentROC485 mrRoc485 ON rs.ceo_epiid = mrRoc485.epi_id
			JOIN dbo.PAYOR_SOURCES(NOLOCK) ps ON ps.ps_id=cefs.cefs_psid
			LEFT JOIN dbo.CLIENT_ORDERS_ALL(NOLOCK) co ON co.o_id = cdp.cdp_oid
			JOIN dbo.ORDER_TYPES(NOLOCK) ot ON ot.ot_id=co.o_otid
			WHERE cefs.cefs_active ='Y'
			AND cefs.cefs_ps <> 'I'
			AND ps.ps_freq NOT IN (10)
			AND cdp.cdp_DiagnosisProcedureTypeSourceId = 2
			AND cdp.cdp_diICDTypeCode = 'D'
			AND (mro.coa_id = mrRoc485.coa_id
				OR mrRoc485.isApproved = 0)
			) AS qry WHERE rnum_dup =1
			ORDER BY qry.o_otid,qry.cdp_SortOrder 
			------- Selecting all NON PDGM records END HERE -------
			
			------- Selecting all PDGM records-------
			INSERT INTO #TempPDGMEpisodeDiagnoses
			(
			    ced_epiid,
			    pp_periodnumber,
			    ceo_id,
			    ced_diICDCode,
			    cdp_SortOrder,
				o_otid
			)			
			SELECT
				cefs.cefs_epiid,
				pp.pp_periodnumber,
				pp.pp_ceoid,
				cdp.cdp_diICDCode, 
				cdp.cdp_SortOrder,
				CASE WHEN ot.ot_code ='ROC' THEN 1
				WHEN ot.ot_code ='485' THEN 2
				ELSE 3
				END [o_otid]
			FROM
			PDGM.PDGM_PERIOD (NOLOCK) AS pp
			JOIN dbo.CLIENT_EPISODE_FS (NOLOCK) AS cefs ON cefs.cefs_id = pp.pp_cefsId
			JOIN dbo.CLIENT_DIAGNOSES_AND_PROCEDURES(NOLOCK) AS cdp ON cdp.cdp_oid = pp.pp_currentorder
			INNER JOIN #resultset rs ON cefs.cefs_epiid = rs.ceo_epiid
			JOIN #MostRecentOrder mro ON rs.ceo_epiid = mro.epi_id
			JOIN #MostRecentROC485 mrRoc485 ON rs.ceo_epiid = mrRoc485.epi_id
			LEFT JOIN dbo.CLIENT_ORDERS_ALL(NOLOCK) co ON co.o_id = cdp.cdp_oid
			JOIN dbo.ORDER_TYPES(NOLOCK) ot ON ot.ot_id=co.o_otid
			WHERE pp.pp_deleted = 0
			AND cefs.cefs_active ='Y'
			AND cefs.cefs_ps <> 'I'
			AND cdp.cdp_DiagnosisProcedureTypeSourceId = 2
			AND cdp.cdp_diICDTypeCode = 'D'
			AND (mro.coa_id = mrRoc485.coa_id
				OR mrRoc485.isApproved = 0)
			------- Selecting all PDGM records END HERE -------

			-------Merging the data of #NonPDGMEpisodeDiagnoses into #EpisodeDiagnoses for only getting up the unique value-------
			INSERT INTO #TempEpisodeDiagnoses
			(
			    ced_epiid,
			    pp_periodnumber,
			    ceo_id,
			    ced_diICDCode,
				cdp_SortOrder,
				o_otid
			)			
			SELECT ced_epiid,
                   pp_periodnumber,
                   ceo_id,
                   ced_diICDCode,
                   cdp_SortOrder,
				  o_otid FROM #TempPDGMEpisodeDiagnoses			
			
			MERGE #TempEpisodeDiagnoses AS TARGET
			USING #TempNonPDGMEpisodeDiagnoses AS SOURCE
			ON TARGET.ced_epiid = SOURCE.ced_epiid
			AND TARGET.pp_periodnumber= SOURCE.pp_periodnumber
			AND TARGET.ced_diICDCode= SOURCE.ced_diICDCode
			AND TARGET.cdp_SortOrder= SOURCE.cdp_SortOrder
			  WHEN NOT MATCHED THEN
					INSERT (
				ced_epiid,
				pp_periodnumber,
				ced_diICDCode,
				ceo_id,
				cdp_SortOrder,
				o_otid) 
					VALUES (
				SOURCE.ced_epiid,
				SOURCE.pp_periodnumber,
				SOURCE.ced_diICDCode,
				SOURCE.ceo_id,
				SOURCE.cdp_SortOrder,
				SOURCE.o_otid);
			--Merging the data of #NonPDGMEpisodeDiagnoses into #EpisodeDiagnoses for only getting up the unique value END HERE

			---Arranging the sequence as per ROC,485 and other order types ---------
			INSERT INTO #TempSortedEpisodeDiagnoses
			(
			    rownum,
			    ced_epiid,
			    pp_periodnumber,
				ceo_id,
			    ced_diICDCode,
			    o_otid
			)
			SELECT
				ROW_NUMBER() OVER (PARTITION BY ced_epiid,pp_periodnumber ORDER BY o_otid,cdp_SortOrder),
				ced_epiid,
				pp_periodnumber,
				ceo_id,
				ced_diICDCode,
				o_otid FROM #TempEpisodeDiagnoses
			
			---Arranging the sequence as per ROC,485 and other order types end here ---------
			
			----- Populating data in #EpisodeDiagnoses with appropriate sequence generation -----
			INSERT INTO #EpisodeDiagnoses
			(
			    rownum,
			    ced_epiid,
			    pp_periodnumber,
			    ceo_id,
			    ced_diICDCode
			)
			SELECT 
			ROW_NUMBER() OVER (PARTITION BY ced_epiid,pp_periodnumber ORDER BY o_otid),
			ced_epiid,
            pp_periodnumber,
			ceo_id,
            ced_diICDCode FROM #TempSortedEpisodeDiagnoses
			----- Populating data in #EpisodeDiagnoses with appropriate sequence generation END HERE-----

			UPDATE r1
			SET r1.Planned_Hospitalization = 1
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'PH'
				AND ai.cevaa_ceva_aid = 910538

			UPDATE r1
			SET r1.Inpatient_Diagnosis_Code_Primary = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'DC'
				AND ai.RowNum = 1

			UPDATE r1
			SET r1.Inpatient_Diagnosis_Code_Other_1 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'DC'
				AND ai.RowNum = 2

			UPDATE r1
			SET r1.Inpatient_Diagnosis_Code_Other_2 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'DC'
				AND ai.RowNum = 3

			UPDATE r1
			SET r1.Inpatient_Diagnosis_Code_Other_3 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'DC'
				AND ai.RowNum = 4

			UPDATE r1
			SET r1.Inpatient_Diagnosis_Code_Other_4 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'DC'
				AND ai.RowNum = 5

			UPDATE r1
			SET r1.Inpatient_Diagnosis_Code_Other_5 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'DC'
				AND ai.RowNum = 6

			UPDATE r1
			SET r1.Inpatient_Procedure_Code_Primary = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'PC'
				AND ai.RowNum = 1

			UPDATE r1
			SET r1.Inpatient_Procedure_Code_Other_1 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'PC'
				AND ai.RowNum = 2

			UPDATE r1
			SET r1.Inpatient_Procedure_Code_Other_2 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'PC'
				AND ai.RowNum = 3

			UPDATE r1
			SET r1.Inpatient_Procedure_Code_Other_3 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'PC'
				AND ai.RowNum = 4

			UPDATE r1
			SET r1.Inpatient_Procedure_Code_Other_4 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'PC'
				AND ai.RowNum = 5

			UPDATE r1
			SET r1.Inpatient_Procedure_Code_Other_5 = ai.cevaa_diICDCode
			FROM #resultset r1
			JOIN #AssessItems ai ON ai.ceo_id = r1.ceo_id
			WHERE ai.flag = 'PC'
				AND ai.RowNum = 6

			COMMIT TRAN

			IF EXISTS (
					SELECT 1
					FROM #resultset
					)
				AND EXISTS (
					SELECT 1
					FROM dbo.VENDOR_DETAILS
					WHERE vd_vid = @VendorID
						AND vd_key LIKE 'SubstituteOASISAnswer%'
					)
			BEGIN
				INSERT INTO #omidset (
					soatask
					,omid
					)
				SELECT DISTINCT REPLACE(vd_key, 'SubstituteOASISAnswer-', '')
					,vd_value
				FROM dbo.VENDOR_DETAILS
				WHERE vd_vid = @VendorID
					AND vd_key LIKE 'SubstituteOASISAnswer%'

				INSERT INTO #OFFSET
				(
					omid,
					ovl_VersionCD2,
					omoffset
				)
				SELECT om.omid
					,o1.ovl_VersionCD2
					,SUM(m2.om_alength)
				FROM #omidset om
				INNER JOIN dbo.OASIS_mos m1 ON m1.om_id = om.omid
				INNER JOIN dbo.OASIS_Version_Layouts o1 ON o1.ovl_omid = m1.om_id
				INNER JOIN dbo.OASIS_Version_Layouts o2 ON o2.ovl_Location = o1.ovl_Location
					AND o2.ovl_VersionCD2 = o1.ovl_VersionCD2
					AND o2.ovl_order < o1.ovl_order
				INNER JOIN dbo.OASIS_mos m2 ON m2.om_id = o2.ovl_omid
				WHERE o1.ovl_Location = 'B'
					AND EXISTS (
						SELECT 1 ceo_VersionCD2
						FROM #resultset
						where ceo_versionCD2 = o1.ovl_VersionCD2
						)
				GROUP BY om.omid
					,o1.ovl_VersionCD2

				UPDATE r1
				SET ceo_OASISbody = LEFT(r1.ceo_OASISbody, f1.omoffset) + CASE 
						WHEN omid1.soatask = 'UnEncrypt'
							THEN LEFT(a1.ceoa_Answer + REPLICATE(' ', om.om_alength), om.om_alength)
						WHEN omid1.soatask = 'Branch'
							THEN LEFT(e1.epi_branchcode + REPLICATE(' ', om.om_alength), om.om_alength)
						WHEN omid1.soatask = 'MRN'
							THEN LEFT(e1.epi_mrnum + REPLICATE(' ', om.om_alength), om.om_alength)
						WHEN omid1.soatask = 'LockDate'
							THEN LEFT(isnull((
											SELECT REPLACE(Convert(VARCHAR(10), MAX(ceoh.ceoh_transdate), 21), '-', '')
											FROM #oasishistory ceoh
											WHERE ceoh.ceoh_ceoid = o1.ceo_id
												AND ceoh_transtype = 'LOCKED'
											), '') + REPLICATE(' ', om.om_alength), om.om_alength)
						WHEN omid1.soatask = 'SHPPrvID'
							THEN LEFT(isnull((
											SELECT TOP (1) vsb_vdefconfig1
											FROM dbo.VENDORS_SERVICELINES_BRANCHES
											WHERE vsb_vid = @VendorID
												AND vsb_slid = 1
												AND vsb_branchcode IN (
													'ALL'
													,e1.epi_branchcode
													)
											ORDER BY vsb_branchcode DESC
											), '00000') + REPLICATE(' ', om.om_alength), om.om_alength)
						ELSE REPLICATE(' ', om.om_alength)
						END + SUBSTRING(r1.ceo_OASISbody, f1.omoffset + om.om_alength + 1, 4000)
				FROM #resultset r1
				INNER JOIN #OFFSET f1 ON f1.ovl_VersionCD2 = r1.ceo_versioncd2
				INNER JOIN #omidset omid1 ON f1.omid = omid1.omid
				INNER JOIN #ceo o1 ON o1.ceo_id = r1.ceo_id
				INNER JOIN #episodes e1 ON e1.epi_id = r1.ceo_epiid
					AND e1.epi_status <> 'DELETED'
				INNER JOIN dbo.CLIENT_EPISODE_OASIS_ANSWERS a1 ON a1.ceoa_ceoid = r1.ceo_id
				INNER JOIN dbo.OASIS_MOS om ON om.om_id = a1.ceoa_omid
					AND om.om_id = omid1.omid
				WHERE omid1.soatask <> 'UnEncrypt'
					OR (LEFT(a1.ceoa_oasisanswer, om.om_alength) <> LEFT(a1.ceoa_answer, om.om_alength))
			END

			BEGIN TRAN

			UPDATE r2
			SET r2.ReferralSource = CASE 
					WHEN e2.epi_ReferralSource = 'FACILITY'
						THEN COALESCE(e2.epi_ReferralSource + ': ' + fa1.fa_name, '')
					WHEN e2.epi_ReferralSource = 'PHYSICIAN'
						THEN COALESCE(e2.epi_ReferralSource + ': ' + ph1.PH_firstname + ' ' + ph1.PH_lastname, '')
					WHEN e2.epi_ReferralSource = 'OTHER'
						THEN COALESCE(e2.epi_ReferralSource + ': ' + e2.epi_ReferralContact, '')
					ELSE 'OTHER'
					END
			FROM #resultset r2
			INNER JOIN #episodes e2 ON e2.epi_id = r2.ceo_epiid
				AND e2.epi_status <> 'DELETED'
			LEFT JOIN dbo.FACILITIES fa1 ON fa1.fa_id = e2.epi_ReferralFaID
			LEFT JOIN dbo.PHYSICIANS ph1 ON ph1.ph_id = e2.epi_phid

			UPDATE r3
			SET r3.PayerName = ps.ps_desc
			FROM #resultset r3
			INNER JOIN #episodes e3 ON e3.epi_id = r3.ceo_epiid
				AND e3.epi_status <> 'DELETED'
			LEFT JOIN dbo.CLIENT_EPISODE_FS cefs ON cefs.cefs_epiid = e3.epi_id
			INNER JOIN dbo.PAYOR_SOURCES ps ON ps.ps_id = cefs.cefs_psid
				AND cefs.cefs_ps = 'P'
				AND cefs.cefs_active = 'Y'
			WHERE cefs.cefs_ps = 'P'
				AND cefs.cefs_active = 'Y'

			UPDATE r4
			SET r4.ProviderId = ISNULL((
						SELECT TOP (1) vsb_vdefconfig2
						FROM dbo.VENDORS_SERVICELINES_BRANCHES
						WHERE vsb_vid = @VendorID
							AND vsb_slid = 1
							AND vsb_branchcode IN (
								'ALL'
								,e4.epi_branchcode
								)
						ORDER BY vsb_branchcode DESC
						), '00000')
				,r4.ActivationCode = ISNULL((
						SELECT TOP (1) vsb_vdefconfig3
						FROM dbo.VENDORS_SERVICELINES_BRANCHES
						WHERE vsb_vid = @VendorID
							AND vsb_slid = 1
							AND vsb_branchcode IN (
								'ALL'
								,e4.epi_branchcode
								)
						ORDER BY vsb_branchcode DESC
						), '')
				,r4.VendorId = ISNULL((
						SELECT TOP (1) vsb_vdefconfig1
						FROM dbo.VENDORS_SERVICELINES_BRANCHES
						WHERE vsb_vid = @VendorID
							AND vsb_slid = 1
							AND vsb_branchcode IN (
								'ALL'
								,e4.epi_branchcode
								)
						ORDER BY vsb_branchcode DESC
						), '')
			FROM #resultset r4
			INNER JOIN #episodes e4 ON e4.epi_id = r4.ceo_epiid
				AND e4.epi_status <> 'DELETED'

			COMMIT TRAN

			SELECT @customerDefinedKey = vd_value
			FROM dbo.VENDOR_DETAILS
			WHERE vd_vid = @VendorID
				AND vd_key = 'CustomerDefinedKey'

			SELECT @customerDefinedValues = vd_value
			FROM dbo.VENDOR_DETAILS
			WHERE vd_vid = @VendorID
				AND vd_key = 'CustomerDefinedValues'

			DECLARE @valueTable TABLE (id INT NULL)

			DECLARE @caretypes TABLE(
				cect_epiid INT NULL
				,CareTypes VARCHAR(max) NULL
				)

			IF (@customerDefinedKey IS NOT NULL)
				AND (@customerDefinedValues IS NOT NULL)
			BEGIN
				IF @customerDefinedKey = 'WorkflowStage-EndedBy'
				BEGIN
					INSERT INTO @valueTable (id)
					SELECT StringName
					FROM dbo.fn_SplitStringCLR(@customerDefinedValues, ',')

					UPDATE rs
					SET rs.CustomerDefined = cees.cees_endby
					FROM #resultset rs
					INNER JOIN dbo.CLIENT_EPISODE_EVENTS cee ON rs.ceo_epiid = cee.cee_epiid
					INNER JOIN dbo.CLIENT_EPISODE_EVENT_STAGES cees ON cee.cee_id = cees.cees_ceeid
					INNER JOIN @valueTable vt ON cees.cees_stid = vt.id
				END

				IF @customerDefinedKey = 'CareTypes-Specified'
				BEGIN
					INSERT INTO @valueTable (id)
					SELECT StringName
					FROM dbo.fn_SplitStringCLR(@customerDefinedValues, ',')

					INSERT INTO @caretypes (
						cect_epiid
						,CareTypes
						)
					SELECT cect.cect_epiid
						,STUFF((
								SELECT ', ' + ct2.ctype_description
								FROM dbo.CLIENT_EPISODE_CARE_TYPES cect2
								INNER JOIN dbo.CARE_TYPES ct2 ON cect2.cect_ctypeid = ct2.ctype_id
								INNER JOIN (
									SELECT DISTINCT ceo_epiid
									FROM #resultset
									) rs ON cect2.cect_epiid = rs.ceo_epiid
								WHERE cect2.cect_epiid = cect.cect_epiid
								AND	EXISTS
									(
										SELECT id
										FROM @valueTable
										WHERE id = cect2.cect_ctypeid
									)
								FOR XML PATH('')
									,TYPE
								).value('(./text())[1]', 'VARCHAR(MAX)'), 1, 2, '') AS CareTypes
					FROM dbo.CLIENT_EPISODE_CARE_TYPES cect
					INNER JOIN dbo.CARE_TYPES ct ON cect.cect_ctypeid = ct.ctype_id
					WHERE EXISTS
					(
						SELECT id
						FROM @valueTable
						WHERE id = cect.cect_ctypeid
					)
					GROUP BY cect.cect_epiid

					UPDATE rs
					SET rs.CustomerDefined = CT.CareTypes
					FROM #resultset rs
					INNER JOIN @caretypes ct ON ct.cect_epiid = rs.ceo_epiid
				END

				IF @customerDefinedKey = 'CareTypes-Except'
				BEGIN
					INSERT INTO @valueTable (id)
					SELECT StringName
					FROM dbo.fn_SplitStringCLR(@customerDefinedValues, ',')

					INSERT INTO @caretypes (
						cect_epiid
						,CareTypes
						)
					SELECT cect.cect_epiid
						,STUFF((
								SELECT ', ' + ct.ctype_description
								FROM dbo.CLIENT_EPISODE_CARE_TYPES cect2
								INNER JOIN dbo.CARE_TYPES ct2 ON cect2.cect_ctypeid = ct2.ctype_id
								INNER JOIN (
									SELECT DISTINCT ceo_epiid
									FROM #resultset
									) rs ON cect2.cect_epiid = rs.ceo_epiid
								WHERE cect2.cect_epiid = cect.cect_epiid
								AND NOT EXISTS
									(	
										SELECT id
										FROM @valueTable
										where id = cect2.cect_ctypeid 
									)
								FOR XML PATH('')
									,TYPE
								).value('(./text())[1]', 'VARCHAR(MAX)'), 1, 2, '') AS CareTypes
					FROM dbo.CLIENT_EPISODE_CARE_TYPES cect
					INNER JOIN dbo.CARE_TYPES ct ON cect.cect_ctypeid = ct.ctype_id
					WHERE NOT EXISTS (	
										SELECT id
										FROM @valueTable
										where id = cect.cect_ctypeid 
									)
					GROUP BY cect.cect_epiid

					UPDATE rs
					SET rs.CustomerDefined = CT.CareTypes
					FROM #resultset rs
					INNER JOIN @caretypes ct ON ct.cect_epiid = rs.ceo_epiid
				END

				IF @customerDefinedKey = 'PatientProgram-Specified'
				BEGIN
					INSERT INTO @valueTable (id)
					SELECT StringName
					FROM dbo.fn_SplitStringCLR(@customerDefinedValues, ',')

					UPDATE rs
					SET rs.CustomerDefined = CT.pp_program
					FROM #resultset rs
					INNER JOIN (
						SELECT epi.epi_id
							,pp.pp_program
							,cpp.cpp_effectivefrom
							,cpp.cpp_effectiveto
							,cpp.cpp_active
						FROM dbo.CLIENT_PATIENT_PROGRAMS cpp
						INNER JOIN dbo.PATIENT_PROGRAMS pp ON pp.pp_id = cpp.cpp_ppid
						INNER JOIN #episodes epi ON epi.epi_paid = cpp.cpp_paid
						WHERE 
							EXISTS
							(
								SELECT id
								FROM @valueTable
								where id =cpp.cpp_ppid 
							)
							AND epi.epi_status <> 'NON-ADMIT'
						) ct ON ct.epi_id = rs.ceo_epiid
						AND ct.cpp_effectivefrom <= DATEADD(dd, DATEDIFF(dd, 0, rs.ceo_insertdate), 0)
						AND (
							ct.cpp_effectiveto >= DATEADD(dd, DATEDIFF(dd, 0, rs.ceo_insertdate), 0)
							OR ct.cpp_effectiveto IS NULL
							)
						AND ct.cpp_active = 1
				END

				IF @customerDefinedKey = 'PatientProgram-Except'
				BEGIN
					INSERT INTO @valueTable (id)
					SELECT StringName
					FROM dbo.fn_SplitStringCLR(@customerDefinedValues, ',')

					UPDATE rs
					SET rs.CustomerDefined = CT.pp_program
					FROM #resultset rs
					INNER JOIN (
						SELECT epi.epi_id
							,pp.pp_program
							,cpp.cpp_effectivefrom
							,cpp.cpp_effectiveto
							,cpp.cpp_active
						FROM dbo.CLIENT_PATIENT_PROGRAMS cpp
						INNER JOIN dbo.PATIENT_PROGRAMS pp ON pp.pp_id = cpp.cpp_ppid
						INNER JOIN #episodes epi ON epi.epi_paid = cpp.cpp_paid
						WHERE 
							NOT EXISTS
							(
								SELECT id
								FROM @valueTable
								where id = CPP.cpp_ppid
							)
							AND epi.epi_status <> 'NON-ADMIT'
						) ct ON CT.epi_id = rs.ceo_epiid
						AND ct.cpp_effectivefrom <= DATEADD(dd, DATEDIFF(dd, 0, rs.ceo_insertdate), 0)
						AND (
							ct.cpp_effectiveto >= DATEADD(dd, DATEDIFF(dd, 0, rs.ceo_insertdate), 0)
							OR ct.cpp_effectiveto IS NULL
							)
						AND ct.cpp_active = 1
				END
			END

			--------------------------------------------Update prior inpatient facility---------------------------------------------
			SELECT @sendPriorInpatientFacility = vd_Value
			FROM dbo.VENDOR_DETAILS
			WHERE vd_vid = @VendorID
				AND vd_key = 'SendPriorInpatientFacility'

			IF @sendPriorInpatientFacility IS NOT NULL
				AND @sendPriorInpatientFacility = 'Y'
			BEGIN
				UPDATE rs
				SET rs.PriorInpatientFacility = fa.fa_name
				FROM #resultset rs
				INNER JOIN dbo.CLIENT_EPISODE_INPATIENT_EVENTS ceie ON ceie.ceie_epiid = rs.ceo_epiid
				INNER JOIN dbo.FACILITIES fa ON ceie.ceie_faid = fa.fa_id
				INNER JOIN #episodes epi ON rs.ceo_epiid = epi.epi_id
				WHERE ceie.ceie_dischargedate <= epi.epi_SocDate
					AND ceie.ceie_admitdate <= epi.epi_SocDate
					AND ceie.ceie_partofreferral = 'Y'
					AND epi.epi_status <> 'DELETED'
			END

			IF @specific_ceoid IS NULL
			BEGIN
			
				IF @@SERVERNAME LIKE 'P%'  --If we are running in production, insert rows to staging tables
				BEGIN

					--Insert base rows
					INSERT INTO DBLS_INTERFACES_PROD.INTERFACES_PROD.dbo.SHP_OASIS_STAGING ----- INTERFACES_PROD DB 	
						(
						sos_ceoid
						,sos_OASIScorrectionnum
						,sos_cevid
						,sos_epiid
						,sos_OASISheader
						,sos_OASISbody
						,sos_OASIStrailer
						,sos_OASISInactivation
						,sos_HIPPS
						,sos_HHRG
						,sos_OASISKey
						,sos_versioncd2
						,sos_insertdate
						,sos_lastupdate
						,sos_Clinicain_Name
						,sos_Case_Manager
						,sos_Team
						,sos_status
						,sos_referral_source
						,sos_primary_payer_name
						,sos_processed
						,sos_ProviderID
						,sos_ActivationCode
						,sos_dbname
						,sos_prior_inpatient_facility
						,sos_customer_defined
						,sos_sosinsertdate
						,sos_Patient_Telephone
						,sos_Planned_Hospitalization
						,sos_Discharge_Status_Code
						,sos_Inpatient_Diagnosis_Code_Primary
						,sos_Inpatient_Diagnosis_Code_Other_1
						,sos_Inpatient_Diagnosis_Code_Other_2
						,sos_Inpatient_Diagnosis_Code_Other_3
						,sos_Inpatient_Diagnosis_Code_Other_4
						,sos_Inpatient_Diagnosis_Code_Other_5
						,sos_Inpatient_Procedure_Code_Primary
						,sos_Inpatient_Procedure_Code_Other_1
						,sos_Inpatient_Procedure_Code_Other_2
						,sos_Inpatient_Procedure_Code_Other_3
						,sos_Inpatient_Procedure_Code_Other_4
						,sos_Inpatient_Procedure_Code_Other_5
						)
					SELECT ceo_id
						,ceo_OASIScorrectionnum
						,ceo_cevid
						,ceo_epiid
						,ceo_OASISheader
						,ceo_OASISbody
						,ceo_OASIStrailer
						,ceo_OASISInactivation
						,ceo_HIPPS
						,ceo_HHRG
						,ceo_OASISKey
						,ceo_versioncd2
						,ceo_insertdate
						,ceo_lastupdate
						,ceo_Clinicain_Name
						,ceo_Case_Manager
						,ceo_Team
						,ceo_status
						,ReferralSource
						,PayerName
						,'N'
						,ProviderId
						,ActivationCode
						,DB_NAME() AS DatabaseName
						,PriorInpatientFacility
						,CustomerDefined
						,GETDATE() AS SOSInsertDate
						,Patient_Telephone
						,Planned_Hospitalization
						,Discharge_Status_Code
						,Inpatient_Diagnosis_Code_Primary
						,Inpatient_Diagnosis_Code_Other_1
						,Inpatient_Diagnosis_Code_Other_2
						,Inpatient_Diagnosis_Code_Other_3
						,Inpatient_Diagnosis_Code_Other_4
						,Inpatient_Diagnosis_Code_Other_5
						,Inpatient_Procedure_Code_Primary
						,Inpatient_Procedure_Code_Other_1
						,Inpatient_Procedure_Code_Other_2
						,Inpatient_Procedure_Code_Other_3
						,Inpatient_Procedure_Code_Other_4
						,Inpatient_Procedure_Code_Other_5
					FROM #resultset r2
					WHERE r2.ceo_OASISbody IS NOT NULL
									
					--Insert up to 25 diagnoses for each episode/period
					INSERT INTO DBLS_INTERFACES_PROD.INTERFACES_PROD.dbo.SHP_OASIS_STAGING_DIAGS
					(
						sosd_sosid,
						sosd_period,
						sosd_num,
						sosd_code,
						sosd_ceoid,
						sosd_dbname
					)
					SELECT DISTINCT
						-1,
						ed.pp_periodnumber,
						ed.rownum,
						ed.ced_diICDCode,
						ed.ceo_id,
						DB_NAME()
					FROM #EpisodeDiagnoses ed
					JOIN #resultset rs on ed.ceo_id = rs.ceo_id
					WHERE ed.rownum <= 25
					and rs.ceo_OASISbody IS NOT NULL

					SELECT CAST(@@ROWCOUNT AS VARCHAR(8000)) + ' rows inserted over to INTERFACES_PROD.dbo.SHP_OASIS_STAGING'
				END
				ELSE --Not in production, return rows that would have been inserted as result sets
				BEGIN
					SELECT ceo_id
						,ceo_OASIScorrectionnum
						,ceo_cevid
						,ceo_epiid
						,ceo_OASISheader
						,ceo_OASISbody
						,ceo_OASIStrailer
						,ceo_OASISInactivation
						,ceo_HIPPS
						,ceo_HHRG
						,ceo_OASISKey
						,ceo_versioncd2
						,ceo_insertdate
						,ceo_lastupdate
						,ceo_Clinicain_Name
						,ceo_Case_Manager
						,ceo_Team
						,ceo_status
						,ReferralSource
						,PayerName
						,'N'
						,ProviderId
						,ActivationCode
						,DB_NAME() AS DatabaseName
						,PriorInpatientFacility
						,CustomerDefined
						,GETDATE() AS SOSInsertDate
						,Patient_Telephone
						,Planned_Hospitalization
						,Discharge_Status_Code
						,Inpatient_Diagnosis_Code_Primary
						,Inpatient_Diagnosis_Code_Other_1
						,Inpatient_Diagnosis_Code_Other_2
						,Inpatient_Diagnosis_Code_Other_3
						,Inpatient_Diagnosis_Code_Other_4
						,Inpatient_Diagnosis_Code_Other_5
						,Inpatient_Procedure_Code_Primary
						,Inpatient_Procedure_Code_Other_1
						,Inpatient_Procedure_Code_Other_2
						,Inpatient_Procedure_Code_Other_3
						,Inpatient_Procedure_Code_Other_4
						,Inpatient_Procedure_Code_Other_5
					FROM #resultset r2
					WHERE r2.ceo_OASISbody IS NOT NULL

					--Select only the first 25 diagnoses for each episode/period
					SELECT DISTINCT
						ed.rownum,
						ed.ced_epiid,
						ed.pp_periodnumber,
						ed.ced_diICDCode
					FROM #EpisodeDiagnoses ed
					JOIN #resultset rs ON rs.ceo_epiid = ed.ced_epiid
					WHERE ed.rownum <= 25
					ORDER BY ed.ced_epiid, ed.pp_periodnumber

					SELECT DISTINCT 'Final Result',
						-1,
						ed.pp_periodnumber,
						ed.rownum,
						ed.ced_diICDCode,
						ed.ceo_id,
						DB_NAME()
					FROM #EpisodeDiagnoses ed
					JOIN #resultset rs on ed.ceo_id = rs.ceo_id
					WHERE ed.rownum <= 25
					and rs.ceo_OASISbody IS NOT NULL

				END
			END
			ELSE
			BEGIN
				-- if this was a specific ceo_id, generate the xml and return
				DECLARE @strData VARCHAR(MAX)

				SELECT TOP (1) @strData = '<?xml version="1.0" standalone="yes"?>  
					<SHP_OASIS_DATA_REQUEST>  
					<VENDOR_ID><![CDATA[' + CAST(COALESCE(VendorId, '') AS VARCHAR(MAX)) + ']]></VENDOR_ID>   
					<PROVIDER_ID><![CDATA[' + CAST(COALESCE(ProviderId, '') AS VARCHAR(MAX)) + ']]></PROVIDER_ID>    
					<USER_ID />  
					<REQUEST_TYPE>1</REQUEST_TYPE>    
					<OASIS_DATA>    
					<SHP_ASSESSMENT>    
						<ASSESSMENT><![CDATA[' + CAST(dbo.util_RegExReplace(COALESCE(ceo_OASISbody, ''), '[^\u0020-\u007E]', ' ', 0, 0) AS VARCHAR(MAX)) + ']]></ASSESSMENT>   
						<CLINICIAN_NAME>' + CAST(COALESCE(ceo_Clinicain_Name, '') AS VARCHAR(MAX)) + '</CLINICIAN_NAME>
						<CASE_MANAGER><![CDATA[' + CAST(COALESCE(ceo_Case_Manager, '') AS VARCHAR(MAX)) + ']]></CASE_MANAGER>
						<TEAM_NAME><![CDATA[' + CAST(COALESCE(ceo_Team, '') AS VARCHAR(MAX)) + ']]></TEAM_NAME>
						<CUSTOMER_DEFINED><![CDATA[' + CAST(COALESCE(CustomerDefined, '') AS VARCHAR(MAX)) + ']]></CUSTOMER_DEFINED>
						<REFERRAL_SOURCE><![CDATA[' + CAST(COALESCE
						(ReferralSource, '') AS VARCHAR(MAX)) + ']]></REFERRAL_SOURCE>
						<PRIOR_INPATIENT_FACILITY><![CDATA[' + CAST(COALESCE(PriorInpatientFacility, '') AS VARCHAR(MAX)) + ']]></PRIOR_INPATIENT_FACILITY>
						<PRIMARY_PAYER_NAME><![CDATA[' + CAST(COALESCE(PayerName, '') AS VARCHAR(MAX)) + ']]></PRIMARY_PAYER_NAME>
						<PATIENT_TELEPHONE><![CDATA[' + CAST(COALESCE(Patient_Telephone, '') AS VARCHAR(MAX)) + ']]></PATIENT_TELEPHONE>
						<PLANNED_HOSPITALIZATION><![CDATA[' + CAST(COALESCE(Planned_Hospitalization, '') AS VARCHAR(MAX)) + ']]></PLANNED_HOSPITALIZATION>
						<DISCHARGE_STATUS_CODE><![CDATA[' + CAST(COALESCE(Discharge_Status_Code, '') AS VARCHAR(MAX)) + ']]></DISCHARGE_STATUS_CODE>
						<INPATIENT_DIAGNOSIS_CODE_PRIMARY><![CDATA[' + CAST(COALESCE(Inpatient_Diagnosis_Code_Primary, '') AS VARCHAR(MAX)) + ']]></INPATIENT_DIAGNOSIS_CODE_PRIMARY>
						<INPATIENT_DIAGNOSIS_CODE_OTHER_1><![CDATA[' + CAST(COALESCE(Inpatient_Diagnosis_Code_Other_1, '') AS VARCHAR(MAX)) + 
					']]></INPATIENT_DIAGNOSIS_CODE_OTHER_1>
						<INPATIENT_DIAGNOSIS_CODE_OTHER_2><![CDATA[' + CAST(COALESCE(Inpatient_Diagnosis_Code_Other_2, '') AS VARCHAR(MAX)) + ']]></INPATIENT_DIAGNOSIS_CODE_OTHER_2>
						<INPATIENT_DIAGNOSIS_CODE_OTHER_3><![CDATA[' + CAST(COALESCE(Inpatient_Diagnosis_Code_Other_3, '') AS VARCHAR(MAX)) + ']]></INPATIENT_DIAGNOSIS_CODE_OTHER_3>
						<INPATIENT_DIAGNOSIS_CODE_OTHER_4><![CDATA[' + CAST(COALESCE(Inpatient_Diagnosis_Code_Other_4, '') AS VARCHAR(MAX)) + ']]></INPATIENT_DIAGNOSIS_CODE_OTHER_4>
						<INPATIENT_DIAGNOSIS_CODE_OTHER_5><![CDATA[' + CAST(COALESCE(Inpatient_Diagnosis_Code_Other_5, '') AS VARCHAR(MAX)) + ']]></INPATIENT_DIAGNOSIS_CODE_OTHER_5>		
						<INPATIENT_PROCEDURE_CODE_PRIMARY><![CDATA[' + CAST(COALESCE(Inpatient_Procedure_Code_Primary, '') AS VARCHAR(MAX)) + ']]></INPATIENT_PROCEDURE_CODE_PRIMARY>						
						<INPATIENT_PROCEDURE_CODE_OTHER_1><![CDATA[' + CAST(COALESCE(Inpatient_Procedure_Code_Other_1, '') AS VARCHAR(MAX)) + 
					']]></INPATIENT_PROCEDURE_CODE_OTHER_1>						
						<INPATIENT_PROCEDURE_CODE_OTHER_2><![CDATA[' + CAST(COALESCE(Inpatient_Procedure_Code_Other_2, '') AS VARCHAR(MAX)) + ']]></INPATIENT_PROCEDURE_CODE_OTHER_2>						
						<INPATIENT_PROCEDURE_CODE_OTHER_3><![CDATA[' + CAST(COALESCE(Inpatient_Procedure_Code_Other_3, '') AS VARCHAR(MAX)) + ']]></INPATIENT_PROCEDURE_CODE_OTHER_3>						
						<INPATIENT_PROCEDURE_CODE_OTHER_4><![CDATA[' + CAST(COALESCE(Inpatient_Procedure_Code_Other_4, '') AS VARCHAR(MAX)) + ']]></INPATIENT_PROCEDURE_CODE_OTHER_4>						
						<INPATIENT_PROCEDURE_CODE_OTHER_5><![CDATA[' + CAST(COALESCE(Inpatient_Procedure_Code_Other_5, '') AS VARCHAR(MAX)) + ']]></INPATIENT_PROCEDURE_CODE_OTHER_5>
						<PaymentPeriods>'					
				FROM #resultset
				ORDER BY ceo_id ASC

				IF EXISTS (SELECT 1 FROM #EpisodeDiagnoses WHERE pp_periodnumber = 1)
				BEGIN

					SELECT @strData = @strData + 
					'<Period>
						<PeriodNumber>1</PeriodNumber>
						<PrimaryDiagnosisCode>' + CAST(COALESCE(ced_diICDCode,'') AS VARCHAR(MAX)) + '</PrimaryDiagnosisCode>'
					FROM #EpisodeDiagnoses
					WHERE pp_periodnumber = 1
					AND rownum = 1

					IF EXISTS (SELECT 1 FROM #EpisodeDiagnoses WHERE pp_periodnumber = 1 AND rownum > 1)
					BEGIN

						SELECT @strData = @strData + '<OtherDiagnosisCodes>'

						SELECT @strData = @strData + 
						'<OtherDiagnosis>
							<Code>' + CAST(COALESCE(ced_diICDCode,'') AS VARCHAR(MAX)) + '</Code>
							<SequenceNumber>'  + CAST(COALESCE(rownum-1,'') AS VARCHAR(MAX)) + '</SequenceNumber>
						</OtherDiagnosis>'
						FROM #EpisodeDiagnoses
						WHERE pp_periodnumber = 1
						AND rownum > 1 AND rownum <= 25

						SELECT @strData = @strData + '</OtherDiagnosisCodes>'
					END
					SELECT @strData = @strData + 
					'</Period>'
				END

				IF EXISTS (SELECT 1 FROM #EpisodeDiagnoses WHERE pp_periodnumber = 2)
				BEGIN

					SELECT @strData = @strData + 
					'<Period>
						<PeriodNumber>2</PeriodNumber>
						<PrimaryDiagnosisCode>' + CAST(COALESCE(ced_diICDCode,'') AS VARCHAR(MAX)) + '</PrimaryDiagnosisCode>'
					FROM #EpisodeDiagnoses
					WHERE pp_periodnumber = 2
					AND rownum = 1
					
					IF EXISTS (SELECT 1 FROM #EpisodeDiagnoses WHERE pp_periodnumber = 2 AND rownum > 1)
					BEGIN

						SELECT @strData = @strData + '<OtherDiagnosisCodes>'

						SELECT @strData = @strData + 
						'<OtherDiagnosis>
							<Code>' + CAST(COALESCE(ced_diICDCode,'') AS VARCHAR(MAX)) + '</Code>
							<SequenceNumber>'  + CAST(COALESCE(rownum-1,'') AS VARCHAR(MAX)) + '</SequenceNumber>
						</OtherDiagnosis>'
						FROM #EpisodeDiagnoses
						WHERE pp_periodnumber = 2
						AND rownum > 1 AND rownum <= 25
						
						select @strData = @strData + '</OtherDiagnosisCodes>'
					
					END
					SELECT @strData = @strData + 
					'</Period>'

				END

				SELECT @strData = @strData + 
				'</PaymentPeriods>
				</SHP_ASSESSMENT>    
					</OASIS_DATA>    
				  </SHP_OASIS_DATA_REQUEST>'
				
				SELECT @specific_xml = @strData
				
			END
		END

		--set the end date, only if @endDate was NOT specified and specific ceo_id was not specified
		IF @setEndDate = 1
			AND @specific_ceoid IS NULL
		BEGIN
			IF NOT EXISTS (
					SELECT 1
					FROM dbo.VENDOR_DETAILS
					WHERE vd_vid = @VendorID
						AND vd_key = 'LastExecution'
					)
			BEGIN
				INSERT INTO dbo.VENDOR_DETAILS (
					vd_vid
					,vd_key
					,vd_value
					,vd_inserted
					,vd_updated
					)
				VALUES (
					@VendorID
					,'LastExecution'
					,CONVERT(VARCHAR(max), @endDate, 121)
					,GETDATE()
					,GETDATE()
					)
			END
			ELSE
			BEGIN
				UPDATE dbo.VENDOR_DETAILS
				SET vd_value = CONVERT(VARCHAR(max), @endDate, 121)
				WHERE vd_vid = @VendorID
					AND vd_key = 'LastExecution'
			END
		END
	END TRY

	BEGIN CATCH
		IF @@TRANCOUNT > 0
        BEGIN
            ROLLBACK TRANSACTION;
		END
		EXEC dbo.usp_RethrowError
	END CATCH
END