<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns="urn:hl7-org:v3" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:sdtc="urn:hl7-org:sdtc" xmlns:isc="http://extension-functions.intersystems.com" xmlns:exsl="http://exslt.org/common" xmlns:set="http://exslt.org/sets" exclude-result-prefixes="isc xsi sdtc exsl set">
	<xsl:include href="CDA-Support-Files/System/Templates/TemplateIdentifiers-HL7.xsl"/>
	<xsl:include href="CDA-Support-Files/System/Templates/TemplateIdentifiers-CCDA.xsl"/>
	<xsl:include href="CDA-Support-Files/System/OIDs/OIDs-InterSystems.xsl"/>
	<xsl:include href="CDA-Support-Files/System/OIDs/OIDs-Other.xsl"/>
	<xsl:include href="CDA-Support-Files/System/Common/Functions.xsl"/>
	<!-- <xsl:include href="CDA-Support-Files/Export/Common/CCDAv21/Functions.xsl"/> -->
	<xsl:include href="CDA-Support-Files-HCHB-Extensions/Export/Common/CCDAv21/HCHBFunctions.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Common/CCDAv21/Variables.xsl"/>
	<!-- <xsl:include href="CDA-Support-Files/Site/Variables.xsl"/> -->
	<xsl:include href="CDA-Support-Files-HCHB-Extensions/Site/HCHBVariables.xsl"/>
	
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/AdvanceDirective.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/AllergyAndDrugSensitivity.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Assessment.xsl"/> 
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/AssessmentAndPlan.xsl"/>	
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/AuthorParticipation.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Comment.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Condition.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/EncompassingEncounter.xsl"/>
	<xsl:include href="CDA-Support-Files-HCHB-Extensions/Export/Entry-Modules/CCDAv21/HCHBEncounter.xsl"/>
	<!-- <xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Encounter.xsl"/> -->
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/FamilyHistory.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/FunctionalStatus.xsl"/>
  	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Goals.xsl"/>
  	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/HealthConcerns.xsl"/>
	<!-- <xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/HealthcareProvider.xsl"/> -->
	<xsl:include href="CDA-Support-Files-HCHB-Extensions/Export/Entry-Modules/CCDAv21/HCHBHealthcareProvider.xsl"/>	
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/HistoryOfPresentIllness.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Immunization.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/InformationSource.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Instruction.xsl"/>	
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/InsuranceProvider.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/LanguageSpoken.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Medication.xsl"/>
	<!-- <xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/PersonalInformation.xsl"/> -->
	<xsl:include href="CDA-Support-Files-HCHB-Extensions/Export/Entry-Modules/CCDAv21/HCHBPersonalInformation.xsl"/>	
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/PlanOfTreatment.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/PriorityPreference.xsl"/>	
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Procedure.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Result.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/SocialHistory.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/Support.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Entry-Modules/CCDAv21/VitalSign.xsl"/>
	
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/AdvanceDirectives.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/Assessments.xsl"/>	
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/AssessmentAndPlan.xsl"/>	
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/AllergiesAndOtherAdverseReactions.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/ChiefComplaint.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/ChiefComplaintAndReasonForVisit.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/DiagnosticResults.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/DischargeDiagnosis.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/Encounters.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/FamilyHistory.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/FunctionalStatus.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/HealthConcerns.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/HistoryOfPresentIllness.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/HistoryOfPastIllness.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/HospitalAdmissionDiagnosis.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/HospitalDischargeInstructions.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/Immunizations.xsl"/>
	<!-- <xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/Instructions.xsl"/> -->
	<xsl:include href="CDA-Support-Files-HCHB-Extensions/Export/Section-Modules/CCDAv21/HCHBInstructions.xsl"/>	
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/Medications.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/MedicationsAdministered.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/Payers.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/PlanOfTreatment.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/ProblemList.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/ProceduresAndInterventions.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/ReasonForReferral.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/ReasonForVisit.xsl"/>	
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/SocialHistory.xsl"/>
	<xsl:include href="CDA-Support-Files/Export/Section-Modules/CCDAv21/VitalSigns.xsl"/>

	
	<xsl:variable name="documentAddStylesheet"><xsl:apply-templates select="." mode="document-stylesheetReference"/></xsl:variable>
	
	<xsl:include href="CDA-Support-Files/Site/OutputEncoding.xsl"/>
	
	<xsl:template match="/Container">
		<xsl:if test="string-length($documentAddStylesheet) and not($documentAddStylesheet='&#10;')">
			<xsl:processing-instruction name="xml-stylesheet">
				<xsl:value-of select="concat('type=&#34;text/xsl&#34; href=&#34;',$documentAddStylesheet,'&#34;')"/>
	  		</xsl:processing-instruction>	  		
  		</xsl:if>

		<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:sdtc="urn:hl7-org:sdtc">
			<!-- Begin CDA Header -->
			<realmCode code="US"/>
			<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
			
			<xsl:apply-templates select="." mode="fn-templateId-USRealmHeader"/>

			<xsl:apply-templates select="." mode="templateIds-CCDHeader"/>	
			
			<xsl:apply-templates select="Patient" mode="ExportCustom-ClinicalDocument"/>

			<code code="34133-9" codeSystem="{$loincOID}" codeSystemName="{$loincName}" displayName="Summarization of Episode Note"/>			

			<xsl:apply-templates select="." mode="fn-title-forDocument">
				<xsl:with-param name="title1">Clinical Summary Document</xsl:with-param>
			</xsl:apply-templates>				
			
			<effectiveTime value="{$currentDateTime}"/>
			<xsl:apply-templates mode="document-confidentialityCode" select="."/>
			<languageCode code="en-US"/>
			
			<!-- Person Information module -->
			<xsl:apply-templates select="Patient" mode="ePI-personInformation"/>
				
			<!-- Information Source module -->
			<xsl:apply-templates select="Patient" mode="eIS-informationSource"/>
			
			<!-- Support module	-->
			<xsl:apply-templates select="Patient" mode="eS-nextOfKin"/>
			
			<!-- Healthcare Providers module -->
			<xsl:apply-templates select="Patient" mode="eHP-healthcareProviders"/>

			<!-- Encompassing Encounter module -->
			<!-- There should always be just a single Encounter which represents this discharge, per CONF:1198-8471 -->
			<xsl:apply-templates select="Encounters/Encounter[1]" mode="eEE-encompassingEncounter">
				<xsl:with-param name="clinicians" select="'|DIS|ATND|ADM|CON|REF|'"/>
			</xsl:apply-templates>	
			
			<!-- End CDA Header -->
			<!-- Begin CDA Body -->
			<component>
				<structuredBody>
					<!-- Payers -->
					<xsl:apply-templates select="." mode="sP-payers"/>
					
					<!-- Advance Directives module -->
					<xsl:apply-templates select="." mode="sAD-advanceDirectives"/>
					
					<!-- Problem List module -->
					<xsl:apply-templates select="." mode="sPL-problems">
						<xsl:with-param name="sectionRequired" select="'1'"/>
						<xsl:with-param name="entriesRequired" select="'1'"/>						
					</xsl:apply-templates>
					
					<!-- Allergies -->
					<xsl:apply-templates select="." mode="sAOAR-allergies">
						<xsl:with-param name="sectionRequired" select="'1'"/>
						<xsl:with-param name="entriesRequired" select="'1'"/>
					</xsl:apply-templates>
					
					<!-- Family History module -->
					<xsl:apply-templates select="." mode="sFH-familyHistory"/>
					
					<!-- Social History module -->
					<xsl:apply-templates select="." mode="sSH-socialHistory">
						<xsl:with-param name="sectionRequired" select="'1'"/>
					</xsl:apply-templates>

					<!-- Medications module -->
					<xsl:apply-templates select="." mode="sM-medications">
						<xsl:with-param name="sectionRequired" select="'1'"/>
						<xsl:with-param name="entriesRequired" select="'1'"/>						
					</xsl:apply-templates>
					
					<!-- Medications Administered module -->
					<xsl:apply-templates select="." mode="sMA-administeredMedications">
						<xsl:with-param name="sectionRequired" select="'1'"/>
					</xsl:apply-templates>
					
					<!-- Immunizations module -->
					<xsl:apply-templates select="." mode="sIm-immunizations"/>
					
					<!-- Vital Signs module -->
					<xsl:apply-templates select="." mode="sVS-vitalSigns">
						<xsl:with-param name="sectionRequired" select="'1'"/>
						<xsl:with-param name="entriesRequired" select="'1'"/>
					</xsl:apply-templates>	
					
					<!-- Procedures and Interventions module -->
					<xsl:apply-templates select="." mode="sPAI-procedures">
						<xsl:with-param name="sectionRequired" select="'1'"/>
						<xsl:with-param name="entriesRequired" select="'1'"/>
					</xsl:apply-templates>
					
					<!-- Functional Status module -->
					<xsl:apply-templates select="." mode="sFS-functionalStatus"/>
					
					<!-- Plan of Treatment module -->
					<xsl:apply-templates select="." mode="sPOT-planOfTreatment"/>	

					<!-- Reason for Visit module -->				
					<xsl:variable name="hasReasonForVisitData" select="Encounters/Encounter[string-length(VisitDescription/text()) and string-length(EncounterNumber/text())]"/>
					<xsl:if test="$hasReasonForVisitData">
						<xsl:apply-templates select="." mode="sRFV-reasonForVisit">
							<xsl:with-param name="sectionRequired" select="'1'"/>
						</xsl:apply-templates>
					</xsl:if>
					
					<!-- Instructions module -->
					<xsl:apply-templates select="." mode="sIns-Instructions">
						<xsl:with-param name="sectionRequired" select="'1'"/>
					</xsl:apply-templates>
					
					<!-- Encounters module -->
					<xsl:apply-templates select="." mode="sE-encounters"/>
					
					<!-- Results module -->
					<xsl:apply-templates select="." mode="sDR-results">
						<xsl:with-param name="sectionRequired" select="'1'"/>
						<xsl:with-param name="entriesRequired" select="'1'"/>						
					</xsl:apply-templates>
					
					<!-- Assessment module -->
					<xsl:apply-templates select="." mode="sA-assessments">
						<xsl:with-param name="sectionRequired" select="'1'"/>
					</xsl:apply-templates>		

					<!-- Assessment and Plan module-->
					<xsl:apply-templates select="." mode="sANP-assessmentAndPlan"/>						

					<!-- Health Concerns module -->
					<xsl:apply-templates select="." mode="sHC-HealthConcerns"/> 
					
					<!-- Custom export -->
					<xsl:apply-templates select="." mode="ExportCustom-ClinicalDocument"/>
				</structuredBody>
			</component>
			<!-- End CDA Body -->
		</ClinicalDocument>
	</xsl:template>
	
	<xsl:template match="*" mode="templateIds-CCDHeader">
		<templateId root="{$ccda-ContinuityOfCareCCD}"/>
		<templateId root="{$ccda-ContinuityOfCareCCD}" extension="2015-08-01"/>
	</xsl:template>
	
	<!-- confidentialityCode may be overriden by stylesheets that import this one -->
	<xsl:template mode="document-confidentialityCode" match="Container">
		<confidentialityCode nullFlavor="{$confidentialityNullFlavor}"/>
	</xsl:template>

	<!-- This template specifies the name of a stylesheet to reference at the top of the document. -->
	<xsl:template match="*" mode="document-stylesheetReference"></xsl:template>
	
	<!-- This empty template may be overridden with custom logic. -->
	<xsl:template match="*" mode="ExportCustom-ClinicalDocument">
		<xsl:choose>
			<xsl:when test="$documentUniqueId and string-length($documentUniqueId)">
				<id root="2.16.840.1.113883.3.3490" extension="{$documentUniqueId}"/>
			</xsl:when>
			<xsl:otherwise>
				<id root="2.16.840.1.113883.3.3490" extension="{isc:evaluate('createUUID')}"/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
</xsl:stylesheet>
