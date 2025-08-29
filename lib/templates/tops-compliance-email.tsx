import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Img,
  Row,
  Column
} from '@react-email/components'
import type { TOPSReportData } from '@/lib/types'

interface TOPSComplianceEmailProps {
  reportData: TOPSReportData
  reportUrl: string
  recipientEmail: string
}

export const TOPSComplianceEmail: React.FC<TOPSComplianceEmailProps> = ({
  reportData,
  reportUrl,
  recipientEmail
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const activeCertifications = reportData.guards.filter(g => g.certifications?.status === 'active').length
  const expiredCertifications = reportData.guards.filter(g => g.certifications?.status === 'expired').length
  const passedBackgroundChecks = reportData.guards.filter(g => g.backgroundChecks?.status === 'passed').length
  const activeGuards = reportData.guards.filter(g => g.employmentStatus === 'active').length

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={companyName}>{reportData.company.name}</Text>
            <Text style={licenseInfo}>Texas DPS License: {reportData.company.license}</Text>
            <Text style={contactInfo}>Phone: {reportData.company.contact}</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={title}>TOPS Compliance Report Available</Text>
            
            <Text style={greeting}>
              The TOPS compliance report for the period {formatDate(reportData.reportPeriod.startDate)} 
              to {formatDate(reportData.reportPeriod.endDate)} has been generated and is ready for review.
            </Text>

            {/* Report Summary */}
            <Section style={summarySection}>
              <Text style={summaryTitle}>Report Summary</Text>
              
              <Row style={summaryRow}>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Total Guards:</Text>
                  <Text style={summaryValue}>{reportData.guards.length}</Text>
                </Column>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Active Guards:</Text>
                  <Text style={summaryValue}>{activeGuards}</Text>
                </Column>
              </Row>

              <Row style={summaryRow}>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Active Certifications:</Text>
                  <Text style={summaryValue}>{activeCertifications}</Text>
                </Column>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Expired Certifications:</Text>
                  <Text style={summaryValue}>{expiredCertifications}</Text>
                </Column>
              </Row>

              <Row style={summaryRow}>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Passed Background Checks:</Text>
                  <Text style={summaryValue}>{passedBackgroundChecks}</Text>
                </Column>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Report Generated:</Text>
                  <Text style={summaryValue}>{formatDate(reportData.generatedAt)}</Text>
                </Column>
              </Row>
            </Section>

            {/* Action Button */}
            <Section style={buttonSection}>
              <Link href={reportUrl} style={button}>
                Download Report
              </Link>
            </Section>

            {/* Important Notes */}
            <Section style={notesSection}>
              <Text style={notesTitle}>Important Notes:</Text>
              <Text style={notesText}>
                • This report contains sensitive compliance information and should be handled securely
              </Text>
              <Text style={notesText}>
                • The report link will expire in 7 days for security purposes
              </Text>
              <Text style={notesText}>
                • Please review all certification and license expiration dates
              </Text>
              <Text style={notesText}>
                • Contact compliance@summitadvisoryfirm.com for any questions or concerns
              </Text>
            </Section>

            {/* Compliance Statement */}
            <Section style={complianceSection}>
              <Text style={complianceTitle}>Compliance Statement</Text>
              <Text style={complianceText}>
                This report has been generated in compliance with Texas Occupational Code Chapter 1702 
                and the Texas Occupational Property and Security (TOPS) Act reporting requirements. 
                All information contained herein has been verified for accuracy and completeness.
              </Text>
            </Section>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {recipientEmail} as part of Summit Advisory's compliance reporting.
            </Text>
            <Text style={footerText}>
              {reportData.company.name} | {reportData.company.license} | {reportData.company.contact}
            </Text>
            <Text style={footerText}>
              Service Areas: {reportData.company.serviceAreas.join(', ')}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
}

const header = {
  borderBottom: '2px solid #d4af37',
  paddingBottom: '20px',
  marginBottom: '30px',
}

const companyName = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 5px 0',
}

const licenseInfo = {
  fontSize: '14px',
  color: '#666666',
  margin: '0 0 3px 0',
}

const contactInfo = {
  fontSize: '12px',
  color: '#666666',
  margin: '0',
}

const content = {
  padding: '0 20px',
}

const title = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  textAlign: 'center' as const,
  margin: '0 0 20px 0',
}

const greeting = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#333333',
  margin: '0 0 30px 0',
}

const summarySection = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
}

const summaryTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 15px 0',
  textAlign: 'center' as const,
}

const summaryRow = {
  margin: '10px 0',
}

const summaryColumn = {
  width: '50%',
  padding: '5px',
}

const summaryLabel = {
  fontSize: '12px',
  color: '#666666',
  margin: '0 0 2px 0',
}

const summaryValue = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '30px 0',
}

const button = {
  backgroundColor: '#d4af37',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 30px',
}

const notesSection = {
  margin: '30px 0',
}

const notesTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 10px 0',
}

const notesText = {
  fontSize: '14px',
  color: '#555555',
  margin: '0 0 5px 0',
  lineHeight: '1.4',
}

const complianceSection = {
  backgroundColor: '#f0f8ff',
  border: '1px solid #d4af37',
  borderRadius: '6px',
  padding: '15px',
  margin: '30px 0',
}

const complianceTitle = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 8px 0',
}

const complianceText = {
  fontSize: '12px',
  color: '#555555',
  lineHeight: '1.4',
  margin: '0',
}

const divider = {
  borderColor: '#cccccc',
  margin: '30px 0',
}

const footer = {
  textAlign: 'center' as const,
  padding: '0 20px',
}

const footerText = {
  fontSize: '11px',
  color: '#999999',
  margin: '0 0 5px 0',
}