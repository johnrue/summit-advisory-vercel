import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { TOPSReportData } from '@/lib/types'

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #d4af37',
    paddingBottom: 20,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  licenseInfo: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 3,
  },
  contactInfo: {
    fontSize: 10,
    color: '#666666',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#1a1a1a',
  },
  reportSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a',
    backgroundColor: '#f5f5f5',
    padding: 8,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    borderBottomStyle: 'solid',
    minHeight: 25,
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    fontWeight: 'bold',
  },
  tableCol: {
    width: '12.5%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  tableColName: {
    width: '15%',
  },
  tableColWide: {
    width: '20%',
  },
  tableCell: {
    margin: 'auto',
    marginTop: 5,
    marginBottom: 5,
    fontSize: 8,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  summaryBox: {
    width: '30%',
    border: '1px solid #cccccc',
    padding: 10,
    backgroundColor: '#f8f9fa',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  summaryItem: {
    fontSize: 9,
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #cccccc',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666666',
  },
  attestation: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f8ff',
    border: '1px solid #d4af37',
  },
  attestationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  attestationText: {
    fontSize: 9,
    lineHeight: 1.4,
    textAlign: 'justify',
  },
})

interface TOPSReportPDFProps {
  data: TOPSReportData
}

export const TOPSReportPDF: React.FC<TOPSReportPDFProps> = ({ data }) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateShort = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Company Information */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.company.name}</Text>
          <Text style={styles.licenseInfo}>Texas DPS License: {data.company.license}</Text>
          <Text style={styles.contactInfo}>Phone: {data.company.contact}</Text>
          <Text style={styles.contactInfo}>
            Service Areas: {data.company.serviceAreas.join(', ')}
          </Text>
        </View>

        {/* Report Title */}
        <Text style={styles.reportTitle}>TOPS COMPLIANCE REPORT</Text>
        <Text style={styles.reportSubtitle}>
          Texas Occupational Property and Security (TOPS) Act Compliance
        </Text>
        <Text style={styles.reportSubtitle}>
          Report Period: {formatDate(data.reportPeriod.startDate)} - {formatDate(data.reportPeriod.endDate)}
        </Text>

        {/* Guard Roster Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GUARD ROSTER</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={[styles.tableCol, styles.tableColName]}>
                <Text style={styles.tableCell}>Name</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>License #</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>License Exp</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Cert Status</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>BG Check</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>BG Date</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Employment</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Start Date</Text>
              </View>
            </View>

            {/* Table Data */}
            {data.guards.map((guard, index) => (
              <View style={styles.tableRow} key={index}>
                <View style={[styles.tableCol, styles.tableColName]}>
                  <Text style={styles.tableCell}>
                    {guard.firstName} {guard.lastName}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{guard.licenseNumber}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {formatDateShort(guard.licenseExpiry)}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {guard.certifications?.status || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {guard.backgroundChecks?.status || 'Pending'}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {formatDateShort(guard.backgroundChecks?.completedAt || null)}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{guard.employmentStatus}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {formatDateShort(guard.employmentStartDate)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Certification Summary</Text>
            <View style={styles.summaryItem}>
              <Text>Active:</Text>
              <Text>{data.guards.filter(g => g.certifications?.status === 'active').length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Expired:</Text>
              <Text>{data.guards.filter(g => g.certifications?.status === 'expired').length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Pending:</Text>
              <Text>{data.guards.filter(g => g.certifications?.status === 'pending_renewal').length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Total:</Text>
              <Text>{data.guards.length}</Text>
            </View>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Background Checks</Text>
            <View style={styles.summaryItem}>
              <Text>Passed:</Text>
              <Text>{data.guards.filter(g => g.backgroundChecks?.status === 'passed').length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Pending:</Text>
              <Text>{data.guards.filter(g => g.backgroundChecks?.status === 'pending').length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Failed:</Text>
              <Text>{data.guards.filter(g => g.backgroundChecks?.status === 'failed').length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Total:</Text>
              <Text>{data.guards.length}</Text>
            </View>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Employment Status</Text>
            <View style={styles.summaryItem}>
              <Text>Active:</Text>
              <Text>{data.guards.filter(g => g.employmentStatus === 'active').length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Inactive:</Text>
              <Text>{data.guards.filter(g => g.employmentStatus === 'inactive').length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Terminated:</Text>
              <Text>{data.guards.filter(g => g.employmentStatus === 'terminated').length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text>Total:</Text>
              <Text>{data.guards.length}</Text>
            </View>
          </View>
        </View>

        {/* Compliance Attestation */}
        <View style={styles.attestation}>
          <Text style={styles.attestationTitle}>COMPLIANCE ATTESTATION</Text>
          <Text style={styles.attestationText}>
            I hereby certify that the information contained in this TOPS Compliance Report is true, 
            complete, and accurate to the best of my knowledge. All security officers listed herein 
            hold valid Texas Department of Public Safety licenses and have completed required training 
            and background checks in accordance with Texas Occupational Code Chapter 1702 and applicable 
            regulations. This report is submitted in compliance with the Texas Occupational Property 
            and Security (TOPS) Act reporting requirements.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated: {formatDate(data.generatedAt)}</Text>
          <Text>Report ID: {data.reportType.toUpperCase()}</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  )
}