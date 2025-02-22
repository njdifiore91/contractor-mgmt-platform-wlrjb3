using System;

namespace ServiceProvider.Core.Domain.Equipment
{
    /// <summary>
    /// Defines the comprehensive set of equipment categories that can be assigned to inspectors,
    /// supporting inventory management and tracking requirements within the service provider management system.
    /// </summary>
    public enum EquipmentType
    {
        /// <summary>
        /// Standard computing equipment issued to inspectors for data entry, reporting, and administrative tasks.
        /// </summary>
        Laptop = 0,

        /// <summary>
        /// Communication devices including smartphones and cellular devices for field communication.
        /// </summary>
        Mobile = 1,

        /// <summary>
        /// Portable tablet devices optimized for field work and mobile data collection.
        /// </summary>
        Tablet = 2,

        /// <summary>
        /// Specialized equipment used for conducting drug and alcohol screening tests.
        /// </summary>
        TestKit = 3,

        /// <summary>
        /// Personal protective equipment and safety gear required for field operations.
        /// </summary>
        SafetyGear = 4,

        /// <summary>
        /// Specialized tools and instruments used for conducting detailed inspections.
        /// </summary>
        InspectionTool = 5
    }
}