//using System;
//using System.IO;
//using System.Threading.Tasks;
//using System.Collections.Generic;
//using System.Net.Http;
//using Microsoft.Graph;
//using Microsoft.Extensions.Configuration;
//using Microsoft.Extensions.Logging;
//using ServiceProvider.Core.Abstractions;
//using ServiceProvider.Common.Constants;
//using System.Security;
//using System.Linq;
//using Polly;
//using Polly.Retry;

//namespace ServiceProvider.Infrastructure.Storage
//{
//    /// <summary>
//    /// Implements OneDrive-based document storage operations using Microsoft Graph API
//    /// with comprehensive error handling, logging, and security measures.
//    /// </summary>
//    public class OneDriveStorageService : IDocumentStorageService
//    {
//        private readonly IGraphServiceClient _graphClient;
//        private readonly IConfiguration _configuration;
//        private readonly ILogger<OneDriveStorageService> _logger;
//        private readonly AsyncRetryPolicy _retryPolicy;
//        private readonly string _rootFolderPath;
        
//        // Constants for configuration and limits
//        private const int MaxRetryAttempts = 3;
//        private const int RetryDelayMilliseconds = 1000;
//        private const long MaxFileSize = 100 * 1024 * 1024; // 100MB
//        private static readonly string[] AllowedFileTypes = { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".jpg", ".png" };

//        public OneDriveStorageService(
//            IGraphServiceClient graphClient,
//            IConfiguration configuration,
//            ILogger<OneDriveStorageService> logger)
//        {
//            _graphClient = graphClient ?? throw new ArgumentNullException(nameof(graphClient));
//            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
//            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

//            _rootFolderPath = _configuration[ConfigurationConstants.ONEDRIVE_ROOT_FOLDER_KEY]
//                ?? throw new InvalidOperationException("OneDrive root folder path not configured");

//            _retryPolicy = Policy
//                .Handle<ServiceException>()
//                .Or<HttpRequestException>()
//                .WaitAndRetryAsync(
//                    MaxRetryAttempts,
//                    retryAttempt => TimeSpan.FromMilliseconds(RetryDelayMilliseconds * retryAttempt),
//                    OnRetryAsync);

//            _logger.LogInformation("OneDriveStorageService initialized successfully");
//        }

//        /// <inheritdoc/>
//        public async Task<DocumentUploadResult> UploadDocumentAsync(
//            Stream fileStream,
//            string fileName,
//            string folderPath,
//            DocumentMetadata metadata)
//        {
//            try
//            {
//                ValidateUploadParameters(fileStream, fileName, folderPath);
//                await ValidateFileTypeAsync(fileName);

//                var sanitizedFolderPath = SanitizePath(folderPath);
//                var fullPath = Path.Combine(_rootFolderPath, sanitizedFolderPath);

//                var folder = await EnsureFolderExistsAsync(fullPath);
                
//                return await _retryPolicy.ExecuteAsync(async () =>
//                {
//                    var uploadSession = await CreateUploadSessionAsync(folder.Id, fileName);
//                    var uploadResult = await UploadLargeFileAsync(uploadSession, fileStream);

//                    return await CreateUploadResultAsync(uploadResult, metadata);
//                });
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Failed to upload document {FileName} to {FolderPath}", fileName, folderPath);
//                throw;
//            }
//        }

//        /// <inheritdoc/>
//        public async Task<DocumentDownloadResult> DownloadDocumentAsync(
//            string documentId,
//            string version = null,
//            bool trackDownload = true)
//        {
//            try
//            {
//                if (string.IsNullOrEmpty(documentId))
//                    throw new ArgumentException("Document ID cannot be null or empty", nameof(documentId));

//                return await _retryPolicy.ExecuteAsync(async () =>
//                {
//                    var driveItem = await _graphClient.Drive.Items[documentId]
//                        .Request()
//                        .GetAsync();

//                    var stream = await _graphClient.Drive.Items[documentId]
//                        .Content
//                        .Request()
//                        .GetAsync();

//                    if (trackDownload)
//                        await TrackDownloadAsync(documentId);

//                    return new DocumentDownloadResult
//                    {
//                        DocumentStream = stream,
//                        DocumentId = documentId,
//                        Version = driveItem.CTag,
//                        Metadata = await GetDocumentMetadataAsync(documentId),
//                        AccessDetails = new AccessInformation
//                        {
//                            AccessTimestamp = DateTime.UtcNow,
//                            AccessType = "Download"
//                        }
//                    };
//                });
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Failed to download document {DocumentId}", documentId);
//                throw;
//            }
//        }

//        /// <inheritdoc/>
//        public async Task<DocumentDeletionResult> DeleteDocumentAsync(
//            string documentId,
//            bool permanentDelete = false,
//            string deletionReason = null)
//        {
//            try
//            {
//                if (string.IsNullOrEmpty(documentId))
//                    throw new ArgumentException("Document ID cannot be null or empty", nameof(documentId));

//                return await _retryPolicy.ExecuteAsync(async () =>
//                {
//                    if (permanentDelete)
//                    {
//                        await _graphClient.Drive.Items[documentId]
//                            .Request()
//                            .DeleteAsync();
//                    }
//                    else
//                    {
//                        await _graphClient.Drive.Items[documentId]
//                            .Request()
//                            .Select("id,name")
//                            .UpdateAsync(new DriveItem
//                            {
//                                Deleted = new Deleted()
//                            });
//                    }

//                    return new DocumentDeletionResult
//                    {
//                        DocumentId = documentId,
//                        IsDeleted = true,
//                        IsPermanentlyDeleted = permanentDelete,
//                        DeletionTimestamp = DateTime.UtcNow,
//                        DeletedBy = GetCurrentUserIdentity(),
//                        DeletionReason = deletionReason,
//                        AuditInformation = CreateAuditTrail("Delete", documentId)
//                    };
//                });
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Failed to delete document {DocumentId}", documentId);
//                throw;
//            }
//        }

//        /// <inheritdoc/>
//        public async Task<FolderCreationResult> CreateFolderAsync(
//            string folderPath,
//            FolderMetadata metadata,
//            bool inheritPermissions = true)
//        {
//            try
//            {
//                var sanitizedPath = SanitizePath(folderPath);
//                var fullPath = Path.Combine(_rootFolderPath, sanitizedPath);

//                return await _retryPolicy.ExecuteAsync(async () =>
//                {
//                    var pathSegments = fullPath.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
//                    var currentFolder = await GetRootFolderAsync();

//                    foreach (var segment in pathSegments)
//                    {
//                        currentFolder = await CreateOrGetFolderAsync(currentFolder.Id, segment);
//                    }

//                    if (inheritPermissions)
//                        await InheritPermissionsAsync(currentFolder.Id);

//                    return new FolderCreationResult
//                    {
//                        FolderId = currentFolder.Id,
//                        FolderPath = folderPath,
//                        CreationTimestamp = DateTime.UtcNow,
//                        CreatedBy = GetCurrentUserIdentity(),
//                        Metadata = metadata,
//                        SecuritySettings = await GetSecuritySettingsAsync(currentFolder.Id)
//                    };
//                });
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Failed to create folder {FolderPath}", folderPath);
//                throw;
//            }
//        }

//        /// <inheritdoc/>
//        public async Task<DocumentMetadata> GetDocumentMetadataAsync(
//            string documentId,
//            bool includeVersionHistory = true,
//            bool includeAuditTrail = true)
//        {
//            try
//            {
//                if (string.IsNullOrEmpty(documentId))
//                    throw new ArgumentException("Document ID cannot be null or empty", nameof(documentId));

//                return await _retryPolicy.ExecuteAsync(async () =>
//                {
//                    var item = await _graphClient.Drive.Items[documentId]
//                        .Request()
//                        .Expand(i => i.Versions)
//                        .GetAsync();

//                    var metadata = new DocumentMetadata
//                    {
//                        Title = item.Name,
//                        Description = item.Description,
//                        ContentType = item.File.MimeType,
//                        SizeInBytes = item.Size ?? 0,
//                        CreatedDate = item.CreatedDateTime?.DateTime ?? DateTime.UtcNow,
//                        LastModifiedDate = item.LastModifiedDateTime?.DateTime ?? DateTime.UtcNow,
//                        CreatedBy = item.CreatedBy?.User?.DisplayName,
//                        LastModifiedBy = item.LastModifiedBy?.User?.DisplayName,
//                        SecuritySettings = await GetSecuritySettingsAsync(documentId)
//                    };

//                    if (includeVersionHistory)
//                        metadata.VersionHistory = await GetVersionHistoryAsync(documentId);

//                    if (includeAuditTrail)
//                        metadata.AuditTrail = await GetAuditTrailAsync(documentId);

//                    return metadata;
//                });
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Failed to get metadata for document {DocumentId}", documentId);
//                throw;
//            }
//        }

//        private async Task<DriveItem> CreateOrGetFolderAsync(string parentId, string folderName)
//        {
//            var children = await _graphClient.Drive.Items[parentId].Children
//                .Request()
//                .Filter($"name eq '{folderName}' and folder ne null")
//                .GetAsync();

//            if (children.Any())
//                return children.First();

//            var folderItem = new DriveItem
//            {
//                Name = folderName,
//                Folder = new Folder()
//            };

//            return await _graphClient.Drive.Items[parentId].Children
//                .Request()
//                .AddAsync(folderItem);
//        }

//        private async Task<UploadSession> CreateUploadSessionAsync(string folderId, string fileName)
//        {
//            var uploadProps = new DriveItemUploadableProperties
//            {
//                ODataType = null,
//                AdditionalData = new Dictionary<string, object>
//                {
//                    { "@microsoft.graph.conflictBehavior", "rename" }
//                }
//            };

//            return await _graphClient.Drive.Items[folderId]
//                .ItemWithPath(fileName)
//                .CreateUploadSession(uploadProps)
//                .Request()
//                .PostAsync();
//        }

//        private async Task<DriveItem> UploadLargeFileAsync(UploadSession uploadSession, Stream stream)
//        {
//            const int maxChunkSize = 320 * 1024; // 320 KB chunk size
//            var fileUploadTask = new LargeFileUploadTask<DriveItem>(uploadSession, stream, maxChunkSize);
            
//            var progress = new Progress<long>(bytesUploaded =>
//            {
//                _logger.LogDebug("Uploaded {BytesUploaded} bytes", bytesUploaded);
//            });

//            return await fileUploadTask.UploadAsync(progress);
//        }

//        private async Task ValidateFileTypeAsync(string fileName)
//        {
//            var extension = Path.GetExtension(fileName).ToLowerInvariant();
//            if (!AllowedFileTypes.Contains(extension))
//            {
//                var error = $"File type {extension} is not allowed";
//                _logger.LogWarning(error);
//                throw new SecurityException(error);
//            }
//        }

//        private void ValidateUploadParameters(Stream fileStream, string fileName, string folderPath)
//        {
//            if (fileStream == null)
//                throw new ArgumentNullException(nameof(fileStream));

//            if (string.IsNullOrEmpty(fileName))
//                throw new ArgumentException("File name cannot be null or empty", nameof(fileName));

//            if (string.IsNullOrEmpty(folderPath))
//                throw new ArgumentException("Folder path cannot be null or empty", nameof(folderPath));

//            if (fileStream.Length > MaxFileSize)
//                throw new ArgumentException($"File size exceeds maximum limit of {MaxFileSize} bytes");
//        }

//        private string SanitizePath(string path)
//        {
//            return path.Replace("\\", "/")
//                .Trim('/')
//                .Replace("..", string.Empty)
//                .Replace("//", "/");
//        }

//        private async Task OnRetryAsync(Exception ex, TimeSpan delay, int attempt, Context context)
//        {
//            _logger.LogWarning(ex, 
//                "Retry attempt {Attempt} after {Delay}ms delay due to {Error}",
//                attempt, delay.TotalMilliseconds, ex.Message);
//            await Task.CompletedTask;
//        }

//        private string GetCurrentUserIdentity()
//        {
//            // Implementation would get the current user's identity from the authentication context
//            return "system";
//        }

//        private AuditTrail CreateAuditTrail(string operation, string itemId)
//        {
//            return new AuditTrail
//            {
//                // Implementation would create an audit trail entry
//            };
//        }

//        private async Task<SecurityInformation> GetSecuritySettingsAsync(string itemId)
//        {
//            // Implementation would retrieve security settings for the item
//            await Task.CompletedTask;
//            return new SecurityInformation();
//        }

//        private async Task<VersionHistory[]> GetVersionHistoryAsync(string documentId)
//        {
//            // Implementation would retrieve version history
//            await Task.CompletedTask;
//            return Array.Empty<VersionHistory>();
//        }

//        private async Task<AuditTrail[]> GetAuditTrailAsync(string documentId)
//        {
//            // Implementation would retrieve audit trail
//            await Task.CompletedTask;
//            return Array.Empty<AuditTrail>();
//        }

//        private async Task TrackDownloadAsync(string documentId)
//        {
//            // Implementation would track document download in audit trail
//            await Task.CompletedTask;
//        }

//        private async Task InheritPermissionsAsync(string itemId)
//        {
//            // Implementation would set up permission inheritance
//            await Task.CompletedTask;
//        }

//        private async Task<DriveItem> GetRootFolderAsync()
//        {
//            return await _graphClient.Drive.Root
//                .Request()
//                .GetAsync();
//        }
//    }
//}
