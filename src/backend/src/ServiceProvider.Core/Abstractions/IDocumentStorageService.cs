using System;
using System.IO;
using System.Threading.Tasks;

namespace ServiceProvider.Core.Abstractions
{
    /// <summary>
    /// Defines the contract for document storage operations with OneDrive integration.
    /// Provides comprehensive document management capabilities including versioning,
    /// security, and audit trails.
    /// </summary>
    public interface IDocumentStorageService
    {
        /// <summary>
        /// Uploads a document to the storage system with specified folder path and metadata.
        /// </summary>
        /// <param name="fileStream">The content stream of the document to upload</param>
        /// <param name="fileName">The name of the file including extension</param>
        /// <param name="folderPath">The target folder path in the storage system</param>
        /// <param name="metadata">Additional metadata for the document</param>
        /// <returns>Upload result containing document identifier and version information</returns>
        /// <exception cref="ArgumentNullException">Thrown when required parameters are null</exception>
        /// <exception cref="InvalidOperationException">Thrown when upload operation fails</exception>
        /// <exception cref="SecurityException">Thrown when security validation fails</exception>
        Task<DocumentUploadResult> UploadDocumentAsync(
            Stream fileStream,
            string fileName,
            string folderPath,
            DocumentMetadata metadata);

        /// <summary>
        /// Downloads a document from storage with optional version selection.
        /// </summary>
        /// <param name="documentId">Unique identifier of the document</param>
        /// <param name="version">Optional specific version to download</param>
        /// <param name="trackDownload">Whether to track this download in audit history</param>
        /// <returns>Download result containing document stream and metadata</returns>
        /// <exception cref="ArgumentException">Thrown when documentId is invalid</exception>
        /// <exception cref="DocumentNotFoundException">Thrown when document is not found</exception>
        /// <exception cref="SecurityException">Thrown when access is denied</exception>
        Task<DocumentDownloadResult> DownloadDocumentAsync(
            string documentId,
            string version = null,
            bool trackDownload = true);

        /// <summary>
        /// Deletes a document with proper security checks and audit logging.
        /// </summary>
        /// <param name="documentId">Unique identifier of the document to delete</param>
        /// <param name="permanentDelete">Whether to permanently delete or move to recycle bin</param>
        /// <param name="deletionReason">Reason for deletion for audit purposes</param>
        /// <returns>Deletion result containing status and audit information</returns>
        /// <exception cref="ArgumentException">Thrown when documentId is invalid</exception>
        /// <exception cref="SecurityException">Thrown when delete permission is denied</exception>
        Task<DocumentDeletionResult> DeleteDocumentAsync(
            string documentId,
            bool permanentDelete = false,
            string deletionReason = null);

        /// <summary>
        /// Creates a new folder structure with security validation and inheritance.
        /// </summary>
        /// <param name="folderPath">Path where the folder should be created</param>
        /// <param name="metadata">Additional metadata for the folder</param>
        /// <param name="inheritPermissions">Whether to inherit permissions from parent</param>
        /// <returns>Folder creation result with identifier and status</returns>
        /// <exception cref="ArgumentException">Thrown when folderPath is invalid</exception>
        /// <exception cref="SecurityException">Thrown when creation permission is denied</exception>
        Task<FolderCreationResult> CreateFolderAsync(
            string folderPath,
            FolderMetadata metadata,
            bool inheritPermissions = true);

        /// <summary>
        /// Retrieves comprehensive document metadata including version history and audit trail.
        /// </summary>
        /// <param name="documentId">Unique identifier of the document</param>
        /// <param name="includeVersionHistory">Whether to include version history</param>
        /// <param name="includeAuditTrail">Whether to include audit trail</param>
        /// <returns>Detailed document metadata including versions and audit information</returns>
        /// <exception cref="ArgumentException">Thrown when documentId is invalid</exception>
        /// <exception cref="DocumentNotFoundException">Thrown when document is not found</exception>
        Task<DocumentMetadata> GetDocumentMetadataAsync(
            string documentId,
            bool includeVersionHistory = true,
            bool includeAuditTrail = true);
    }

    /// <summary>
    /// Represents the result of a document upload operation.
    /// </summary>
    public class DocumentUploadResult
    {
        public string DocumentId { get; set; }
        public string Version { get; set; }
        public DateTime UploadTimestamp { get; set; }
        public string UploadedBy { get; set; }
        public DocumentMetadata Metadata { get; set; }
        public AuditTrail AuditInformation { get; set; }
    }

    /// <summary>
    /// Represents the result of a document download operation.
    /// </summary>
    public class DocumentDownloadResult
    {
        public Stream DocumentStream { get; set; }
        public string DocumentId { get; set; }
        public string Version { get; set; }
        public DocumentMetadata Metadata { get; set; }
        public AccessInformation AccessDetails { get; set; }
    }

    /// <summary>
    /// Represents the result of a document deletion operation.
    /// </summary>
    public class DocumentDeletionResult
    {
        public string DocumentId { get; set; }
        public bool IsDeleted { get; set; }
        public bool IsPermanentlyDeleted { get; set; }
        public DateTime DeletionTimestamp { get; set; }
        public string DeletedBy { get; set; }
        public string DeletionReason { get; set; }
        public AuditTrail AuditInformation { get; set; }
    }

    /// <summary>
    /// Represents the result of a folder creation operation.
    /// </summary>
    public class FolderCreationResult
    {
        public string FolderId { get; set; }
        public string FolderPath { get; set; }
        public DateTime CreationTimestamp { get; set; }
        public string CreatedBy { get; set; }
        public FolderMetadata Metadata { get; set; }
        public SecurityInformation SecuritySettings { get; set; }
    }

    /// <summary>
    /// Represents metadata associated with a document.
    /// </summary>
    public class DocumentMetadata
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string ContentType { get; set; }
        public long SizeInBytes { get; set; }
        public string[] Tags { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime LastModifiedDate { get; set; }
        public string CreatedBy { get; set; }
        public string LastModifiedBy { get; set; }
        public VersionHistory[] VersionHistory { get; set; }
        public AuditTrail[] AuditTrail { get; set; }
        public SecurityInformation SecuritySettings { get; set; }
    }

    /// <summary>
    /// Represents metadata associated with a folder.
    /// </summary>
    public class FolderMetadata
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string[] Tags { get; set; }
        public DateTime CreatedDate { get; set; }
        public string CreatedBy { get; set; }
        public SecurityInformation SecuritySettings { get; set; }
    }

    #region Missing classes

    /// <summary>
    /// Represents an audit trail entry for document actions.
    /// </summary>

    public class AuditTrail
    {
        public string Action { get; set; }
        public DateTime Timestamp { get; set; }
        public string PerformedBy { get; set; }
        public string Details { get; set; }
    }

    /// <summary>
    /// Represents the security settings for a document or folder.
    /// </summary>

    public class SecurityInformation
    {
        public string Permissions { get; set; }
        public string Owner { get; set; }
        public string[] SharedWith { get; set; }
    }

    /// <summary>
    /// Represents the version history of a document.
    /// </summary>
    public class VersionHistory
    {
        public string Version { get; set; }
        public DateTime Timestamp { get; set; }
        public string ModifiedBy { get; set; }
        public string ChangeDescription { get; set; }
    }

    /// <summary>
    /// Represents the access information for a document.
    /// </summary>

    public class AccessInformation
    {
        public string AccessedBy { get; set; }
        public DateTime AccessedOn { get; set; }
        public string AccessType { get; set; }
        public string AccessDetails { get; set; }
    } 
    #endregion
}
