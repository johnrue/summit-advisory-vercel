import { CertificationRenewalService } from '../certification-renewal-service'
import { AuditService } from '../audit-service'
import { put } from '@vercel/blob'

// Mock Vercel Blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn()
}))

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockRenewalRequest,
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: mockUpdatedRequest,
          error: null
        })),
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockUpdatedRequest,
            error: null
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockRenewalRequest,
            error: null
          })),
          order: jest.fn(() => ({
            data: mockRenewalRequests,
            error: null
          })),
          maybeSingle: jest.fn(() => ({
            data: mockRenewalCheck,
            error: null
          }))
        }))
      }))
    }))
  }
}))

// Mock AuditService
jest.mock('../audit-service', () => ({
  AuditService: {
    getInstance: jest.fn(() => ({
      logAction: jest.fn().mockResolvedValue({ success: true })
    }))
  }
}))

const mockRenewalRequest = {
  id: 'renewal-1',
  guard_certification_id: 'cert-1',
  guard_id: 'guard-1',
  new_document_url: 'https://blob.vercel-storage.com/doc.pdf',
  new_expiry_date: '2025-02-15',
  request_status: 'pending',
  submitted_at: '2024-01-15T10:00:00Z'
}

const mockUpdatedRequest = {
  ...mockRenewalRequest,
  request_status: 'approved',
  reviewed_at: '2024-01-16T10:00:00Z',
  reviewed_by: 'manager-1',
  review_notes: 'Approved - certificate looks valid'
}

const mockRenewalRequests = [mockRenewalRequest]

const mockRenewalCheck = {
  needsRenewal: true,
  daysUntilExpiry: 25,
  hasActivePendingRequest: false
}

const mockFile = new File(['test content'], 'certificate.pdf', { type: 'application/pdf' })

describe('CertificationRenewalService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(put as jest.Mock).mockResolvedValue({ url: 'https://blob.vercel-storage.com/doc.pdf' })
  })

  describe('submitRenewalRequest', () => {
    it('should successfully submit a renewal request', async () => {
      const result = await CertificationRenewalService.submitRenewalRequest({
        certificationId: 'cert-1',
        guardId: 'guard-1',
        newExpiryDate: new Date('2025-02-15'),
        documentFile: mockFile,
        userId: 'guard-1'
      })

      expect(result).toEqual({
        id: 'renewal-1',
        guardCertificationId: 'cert-1',
        guardId: 'guard-1',
        newDocumentUrl: 'https://blob.vercel-storage.com/doc.pdf',
        newExpiryDate: new Date('2025-02-15'),
        requestStatus: 'pending',
        submittedAt: '2024-01-15T10:00:00Z',
        reviewedAt: undefined,
        reviewedBy: undefined,
        reviewNotes: undefined
      })

      // Verify file upload was called
      expect(put).toHaveBeenCalledWith(
        expect.stringContaining('certification-renewals/cert-1/'),
        mockFile,
        {
          access: 'public',
          contentType: 'application/pdf'
        }
      )

      // Verify audit log was created
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith({
        action: 'submitted',
        entity_type: 'certification_renewal',
        entity_id: 'renewal-1',
        details: {
          certificationId: 'cert-1',
          guardId: 'guard-1',
          newExpiryDate: '2025-02-15T00:00:00.000Z',
          documentUrl: 'https://blob.vercel-storage.com/doc.pdf'
        },
        user_id: 'guard-1'
      })
    })

    it('should handle file upload errors', async () => {
      ;(put as jest.Mock).mockRejectedValue(new Error('Upload failed'))

      await expect(CertificationRenewalService.submitRenewalRequest({
        certificationId: 'cert-1',
        guardId: 'guard-1',
        newExpiryDate: new Date('2025-02-15'),
        documentFile: mockFile,
        userId: 'guard-1'
      })).rejects.toThrow('Failed to submit certification renewal request')
    })

    it('should handle database insertion errors', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Insert failed' }
            }))
          }))
        }))
      })

      await expect(CertificationRenewalService.submitRenewalRequest({
        certificationId: 'cert-1',
        guardId: 'guard-1',
        newExpiryDate: new Date('2025-02-15'),
        documentFile: mockFile,
        userId: 'guard-1'
      })).rejects.toThrow('Failed to submit certification renewal request')
    })
  })

  describe('reviewRenewalRequest', () => {
    it('should successfully approve a renewal request', async () => {
      const result = await CertificationRenewalService.reviewRenewalRequest({
        renewalRequestId: 'renewal-1',
        action: 'approved',
        reviewNotes: 'Certificate looks valid',
        reviewedBy: 'manager-1'
      })

      expect(result.requestStatus).toBe('approved')
      expect(result.reviewedBy).toBe('manager-1')
      expect(result.reviewNotes).toBe('Approved - certificate looks valid')

      // Verify audit log was created
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith({
        action: 'approved',
        entity_type: 'certification_renewal',
        entity_id: 'renewal-1',
        details: expect.objectContaining({
          certificationId: 'cert-1',
          guardId: 'guard-1',
          reviewNotes: 'Certificate looks valid',
          previousStatus: 'pending'
        }),
        user_id: 'manager-1'
      })
    })

    it('should successfully reject a renewal request', async () => {
      const rejectedRequest = {
        ...mockUpdatedRequest,
        request_status: 'rejected',
        review_notes: 'Certificate not clear enough'
      }

      require('@/lib/supabase').supabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockRenewalRequest,
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: rejectedRequest,
                error: null
              }))
            }))
          }))
        }))
      }))

      const result = await CertificationRenewalService.reviewRenewalRequest({
        renewalRequestId: 'renewal-1',
        action: 'rejected',
        reviewNotes: 'Certificate not clear enough',
        reviewedBy: 'manager-1'
      })

      expect(result.requestStatus).toBe('rejected')
      expect(result.reviewNotes).toBe('Certificate not clear enough')
    })

    it('should handle non-existent renewal requests', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Not found' }
            }))
          }))
        }))
      })

      await expect(CertificationRenewalService.reviewRenewalRequest({
        renewalRequestId: 'invalid-id',
        action: 'approved',
        reviewedBy: 'manager-1'
      })).rejects.toThrow('Failed to review certification renewal request')
    })
  })

  describe('getPendingRenewalRequests', () => {
    it('should return pending renewal requests', async () => {
      const requests = await CertificationRenewalService.getPendingRenewalRequests()

      expect(Array.isArray(requests)).toBe(true)
      expect(requests[0]).toEqual({
        id: 'renewal-1',
        guardCertificationId: 'cert-1',
        guardId: 'guard-1',
        newDocumentUrl: 'https://blob.vercel-storage.com/doc.pdf',
        newExpiryDate: new Date('2025-02-15'),
        requestStatus: 'pending',
        submittedAt: '2024-01-15T10:00:00Z',
        reviewedAt: undefined,
        reviewedBy: undefined,
        reviewNotes: undefined
      })
    })

    it('should return empty array on database error', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      })

      const requests = await CertificationRenewalService.getPendingRenewalRequests()
      expect(requests).toEqual([])
    })
  })

  describe('getCertificationHistory', () => {
    it('should return certification history', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          guard_certification_id: 'cert-1',
          action: 'renewed',
          new_expiry_date: '2025-02-15',
          created_at: '2024-01-15T10:00:00Z'
        }
      ]

      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockHistory,
              error: null
            }))
          }))
        }))
      })

      const history = await CertificationRenewalService.getCertificationHistory('cert-1')

      expect(Array.isArray(history)).toBe(true)
      expect(history[0]).toEqual({
        id: 'history-1',
        guardCertificationId: 'cert-1',
        action: 'renewed',
        previousExpiryDate: undefined,
        newExpiryDate: new Date('2025-02-15'),
        documentUrl: undefined,
        processedBy: undefined,
        notes: undefined,
        createdAt: '2024-01-15T10:00:00Z'
      })
    })
  })

  describe('getGuardCertifications', () => {
    it('should return guard certifications', async () => {
      const mockCertifications = [
        {
          id: 'cert-1',
          guard_id: 'guard-1',
          certification_type: 'TOPS License',
          expiry_date: '2024-12-31',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockCertifications,
              error: null
            }))
          }))
        }))
      })

      const certifications = await CertificationRenewalService.getGuardCertifications('guard-1')

      expect(Array.isArray(certifications)).toBe(true)
      expect(certifications[0]).toEqual({
        id: 'cert-1',
        guardId: 'guard-1',
        certificationType: 'TOPS License',
        certificateNumber: undefined,
        issuedDate: undefined,
        expiryDate: new Date('2024-12-31'),
        issuingAuthority: undefined,
        documentUrl: undefined,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      })
    })
  })

  describe('checkRenewalNeeded', () => {
    it('should correctly identify certifications needing renewal', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 25)

      require('@/lib/supabase').supabase.from.mockImplementation((table) => {
        if (table === 'guard_certifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: {
                    expiry_date: futureDate.toISOString().split('T')[0],
                    status: 'active'
                  },
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'certification_renewal_requests') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn(() => ({
                  data: null,
                  error: null
                }))
              }))
            }))
          }
        }
        return {}
      })

      const result = await CertificationRenewalService.checkRenewalNeeded('cert-1')

      expect(result).toEqual({
        needsRenewal: true,
        daysUntilExpiry: 25,
        hasActivePendingRequest: false
      })
    })
  })
})