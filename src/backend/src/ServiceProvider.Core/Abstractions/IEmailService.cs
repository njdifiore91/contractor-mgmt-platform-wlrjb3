using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ServiceProvider.Core.Domain.Users;

namespace ServiceProvider.Core.Abstractions
{
    /// <summary>
    /// Defines the interface for email service that handles all email communications in the system.
    /// Provides comprehensive support for notifications, confirmations, alerts, templates, and tracking.
    /// </summary>
    public interface IEmailService
    {
        /// <summary>
        /// Sends an email to a single recipient with tracking and attachment support.
        /// </summary>
        /// <param name="to">Recipient email address</param>
        /// <param name="subject">Email subject line</param>
        /// <param name="body">Email body content (supports HTML)</param>
        /// <param name="priority">Email priority level</param>
        /// <param name="attachments">Optional list of email attachments</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Result containing success status, tracking ID, and error information if any</returns>
        Task<EmailSendResult> SendEmailAsync(
            string to,
            string subject,
            string body,
            EmailPriority priority = EmailPriority.Normal,
            IEnumerable<EmailAttachment> attachments = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Sends a templated email with version control and template validation.
        /// </summary>
        /// <param name="to">Recipient email address</param>
        /// <param name="templateId">Unique identifier of the email template</param>
        /// <param name="templateData">Data object for template variable substitution</param>
        /// <param name="templateVersion">Optional specific version of the template to use</param>
        /// <param name="priority">Email priority level</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Result containing success status, template version used, and tracking information</returns>
        Task<EmailSendResult> SendTemplatedEmailAsync(
            string to,
            string templateId,
            object templateData,
            string templateVersion = null,
            EmailPriority priority = EmailPriority.Normal,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Sends bulk emails to multiple recipients using a template.
        /// </summary>
        /// <param name="recipients">List of recipient email addresses</param>
        /// <param name="templateId">Unique identifier of the email template</param>
        /// <param name="templateData">Data object for template variable substitution</param>
        /// <param name="priority">Email priority level</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Bulk send result containing success/failure counts and individual tracking information</returns>
        Task<BulkEmailSendResult> SendBulkEmailAsync(
            IEnumerable<string> recipients,
            string templateId,
            object templateData,
            EmailPriority priority = EmailPriority.Normal,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Sends a user confirmation email with secure verification link.
        /// </summary>
        /// <param name="user">User entity containing recipient information</param>
        /// <param name="verificationToken">Secure verification token</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Result containing success status and tracking information</returns>
        Task<EmailSendResult> SendUserConfirmationEmailAsync(
            User user,
            string verificationToken,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Sends a password reset email with secure reset link.
        /// </summary>
        /// <param name="user">User entity containing recipient information</param>
        /// <param name="resetToken">Secure password reset token</param>
        /// <param name="tokenExpiryMinutes">Token expiration time in minutes</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Result containing success status and tracking information</returns>
        Task<EmailSendResult> SendPasswordResetEmailAsync(
            User user,
            string resetToken,
            int tokenExpiryMinutes = 30,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves email communication history for auditing and tracking.
        /// </summary>
        /// <param name="emailAddress">Optional email address to filter by</param>
        /// <param name="startDate">Optional start date for the date range</param>
        /// <param name="endDate">Optional end date for the date range</param>
        /// <param name="page">Page number for pagination</param>
        /// <param name="pageSize">Number of records per page</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Paged list of email communication records</returns>
        Task<PagedResult<EmailHistoryRecord>> GetEmailHistoryAsync(
            string emailAddress = null,
            DateTime? startDate = null,
            DateTime? endDate = null,
            int page = 1,
            int pageSize = 20,
            CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Represents email priority levels for message delivery.
    /// </summary>
    public enum EmailPriority
    {
        Low = 0,
        Normal = 1,
        High = 2,
        Urgent = 3
    }

    /// <summary>
    /// Represents an email attachment with content and metadata.
    /// </summary>
    public class EmailAttachment
    {
        public string FileName { get; set; }
        public byte[] Content { get; set; }
        public string ContentType { get; set; }
        public long SizeInBytes { get; set; }
    }

    /// <summary>
    /// Represents the result of an email send operation.
    /// </summary>
    public class EmailSendResult
    {
        public bool IsSuccess { get; set; }
        public string TrackingId { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime SentAt { get; set; }
        public string TemplateVersion { get; set; }
        public IDictionary<string, string> AdditionalData { get; set; }
    }

    /// <summary>
    /// Represents the result of a bulk email send operation.
    /// </summary>
    public class BulkEmailSendResult
    {
        public int TotalRecipients { get; set; }
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public IList<EmailSendResult> IndividualResults { get; set; }
        public DateTime CompletedAt { get; set; }
    }

    /// <summary>
    /// Represents a record in the email communication history.
    /// </summary>
    public class EmailHistoryRecord
    {
        public string TrackingId { get; set; }
        public string Recipient { get; set; }
        public string Subject { get; set; }
        public string TemplateId { get; set; }
        public string TemplateVersion { get; set; }
        public EmailPriority Priority { get; set; }
        public bool WasSuccessful { get; set; }
        public DateTime SentAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? OpenedAt { get; set; }
        public string ErrorDetails { get; set; }
    }

    /// <summary>
    /// Represents a paged result set for email history queries.
    /// </summary>
    public class PagedResult<T>
    {
        public IList<T> Items { get; set; }
        public int TotalItems { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
}