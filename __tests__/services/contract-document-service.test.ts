import {
  uploadContractDocument,
  getContractDocuments,
  updateDocumentStatus,
  sendForSignature,
  checkSignatureStatus,
  createDocumentVersion
} from '@/lib/services/contract-document-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockReturnThis(),
      getPublicUrl: jest.fn().mockReturnThis(),
      list: jest.fn().mockReturnThis()
    },
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
    }
  }
}))

// Mock fetch for external signature providers
global.fetch = jest.fn()

describe('Contract Document Service', () => {
  const mockDocument = {
    id: 'doc-123',
    contract_id: 'contract-123',
    document_type: 'contract',
    file_name: 'security_contract.pdf',
    file_path: 'contracts/contract-123/security_contract.pdf',
    file_size: 1048576,
    mime_type: 'application/pdf',
    version: 1,
    status: 'active',
    signature_status: null,
    signature_provider: null,
    signature_request_id: null,
    uploaded_by: 'user-123',
    created_at: '2025-08-30T12:00:00Z',
    updated_at: '2025-08-30T12:00:00Z'
  }

  const mockFile = new File(['contract content'], 'contract.pdf', { type: 'application/pdf' })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadContractDocument', () => {
    it('should upload document successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock storage upload
      supabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'contracts/contract-123/contract.pdf' },
          error: null
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/contract.pdf' }
        })
      })

      // Mock database insert
      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDocument,
              error: null
            })
          })
        })
      })

      const result = await uploadContractDocument(
        'contract-123',
        mockFile,
        'contract',
        { replaceExisting: false }
      )

      expect(result.success).toBe(true)
      expect(result.data?.fileName).toBe('security_contract.pdf')
      expect(result.data?.fileSize).toBe(1048576)
      expect(result.data?.version).toBe(1)
    })

    it('should validate file type', async () => {
      const invalidFile = new File(['content'], 'document.txt', { type: 'text/plain' })

      const result = await uploadContractDocument(
        'contract-123',
        invalidFile,
        'contract'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid file type')
    })

    it('should validate file size', async () => {
      const largeFile = new File(
        [new ArrayBuffer(15 * 1024 * 1024)], // 15MB
        'large.pdf', 
        { type: 'application/pdf' }
      )

      const result = await uploadContractDocument(
        'contract-123',
        largeFile,
        'contract'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('File size exceeds maximum')
    })

    it('should handle storage upload failure', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' }
        })
      })

      const result = await uploadContractDocument(
        'contract-123',
        mockFile,
        'contract'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage error')
    })

    it('should replace existing document when specified', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock existing document check
      supabase.from.mockImplementation((table: string) => {
        if (table === 'contract_documents') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockDocument,
                    error: null
                  })
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockDocument, version: 2 },
                  error: null
                })
              })
            })
          }
        }
        return {}
      })

      supabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'contracts/contract-123/contract.pdf' },
          error: null
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/contract.pdf' }
        })
      })

      const result = await uploadContractDocument(
        'contract-123',
        mockFile,
        'contract',
        { replaceExisting: true }
      )

      expect(result.success).toBe(true)
      expect(result.data?.version).toBe(2)
    })
  })

  describe('getContractDocuments', () => {
    it('should retrieve all documents for a contract', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [mockDocument],
                error: null
              })
            })
          })
        })
      })

      const result = await getContractDocuments('contract-123')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].fileName).toBe('security_contract.pdf')
    })

    it('should filter documents by type', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockDocument],
          error: null
        })
      }
      
      supabase.from.mockReturnValue(mockQuery)

      const result = await getContractDocuments('contract-123', 'contract')

      expect(result.success).toBe(true)
      expect(mockQuery.eq).toHaveBeenCalledWith('contract_id', 'contract-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('document_type', 'contract')
    })

    it('should include version history when requested', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const documentVersions = [
        { ...mockDocument, version: 2, status: 'active' },
        { ...mockDocument, id: 'doc-124', version: 1, status: 'superseded' }
      ]

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: documentVersions,
              error: null
            })
          })
        })
      })

      const result = await getContractDocuments('contract-123', undefined, true)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
    })
  })

  describe('updateDocumentStatus', () => {
    it('should update document status successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const updatedDocument = { ...mockDocument, status: 'signed' }
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedDocument,
                error: null
              })
            })
          })
        })
      })

      const result = await updateDocumentStatus('doc-123', 'signed')

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('signed')
    })

    it('should validate status values', async () => {
      const result = await updateDocumentStatus('doc-123', 'invalid_status' as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid status')
    })
  })

  describe('sendForSignature', () => {
    it('should send document for DocuSign signature', async () => {
      const { supabase } = require('@/lib/supabase')
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      
      // Mock DocuSign API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          envelopeId: 'envelope-123',
          status: 'sent',
          signingUrl: 'https://docusign.com/sign/123'
        })
      } as Response)

      // Mock document fetch
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDocument,
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      supabase.storage.from.mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/contract.pdf' }
        })
      })

      const signers = [
        { name: 'John Doe', email: 'john@example.com', role: 'Client' },
        { name: 'Jane Smith', email: 'jane@company.com', role: 'Manager' }
      ]

      const result = await sendForSignature('doc-123', 'docusign', signers)

      expect(result.success).toBe(true)
      expect(result.data?.signatureRequestId).toBe('envelope-123')
      expect(result.data?.signingUrls).toHaveLength(2)
    })

    it('should send document for Adobe Sign signature', async () => {
      const { supabase } = require('@/lib/supabase')
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      
      // Mock Adobe Sign API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          agreementId: 'agreement-456',
          status: 'OUT_FOR_SIGNATURE',
          signingUrls: {
            'john@example.com': 'https://adobe.com/sign/456-1',
            'jane@company.com': 'https://adobe.com/sign/456-2'
          }
        })
      } as Response)

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDocument,
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      supabase.storage.from.mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/contract.pdf' }
        })
      })

      const signers = [
        { name: 'John Doe', email: 'john@example.com', role: 'Client' }
      ]

      const result = await sendForSignature('doc-123', 'adobe_sign', signers)

      expect(result.success).toBe(true)
      expect(result.data?.signatureRequestId).toBe('agreement-456')
    })

    it('should handle signature provider API errors', async () => {
      const { supabase } = require('@/lib/supabase')
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid request' })
      } as Response)

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDocument,
              error: null
            })
          })
        })
      })

      supabase.storage.from.mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/contract.pdf' }
        })
      })

      const result = await sendForSignature('doc-123', 'docusign', [])

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to send document')
    })
  })

  describe('checkSignatureStatus', () => {
    it('should check DocuSign signature status', async () => {
      const { supabase } = require('@/lib/supabase')
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'completed',
          signers: [
            { email: 'john@example.com', status: 'signed', signedDateTime: '2025-08-30T10:00:00Z' },
            { email: 'jane@company.com', status: 'signed', signedDateTime: '2025-08-30T11:00:00Z' }
          ]
        })
      } as Response)

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { 
                ...mockDocument, 
                signature_provider: 'docusign',
                signature_request_id: 'envelope-123'
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      const result = await checkSignatureStatus('doc-123')

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('completed')
      expect(result.data?.signers).toHaveLength(2)
    })

    it('should handle document without signature request', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockDocument, signature_request_id: null },
              error: null
            })
          })
        })
      })

      const result = await checkSignatureStatus('doc-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No signature request found for this document')
    })
  })

  describe('createDocumentVersion', () => {
    it('should create new document version successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock finding current version
      supabase.from.mockImplementation((table: string) => {
        if (table === 'contract_documents') {
          const selectMock = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockDocument,
              error: null
            }),
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockDocument, id: 'doc-125', version: 2 },
                  error: null
                })
              })
            })
          }
          return selectMock
        }
        return {}
      })

      supabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'contracts/contract-123/contract_v2.pdf' },
          error: null
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/contract_v2.pdf' }
        })
      })

      const result = await createDocumentVersion(
        'contract-123',
        'contract',
        mockFile,
        'Updated terms and conditions'
      )

      expect(result.success).toBe(true)
      expect(result.data?.version).toBe(2)
    })

    it('should handle no existing document for versioning', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null
                  })
                })
              })
            })
          })
        })
      })

      const result = await createDocumentVersion(
        'contract-123',
        'contract',
        mockFile
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('No existing document found to create version from')
    })
  })
})