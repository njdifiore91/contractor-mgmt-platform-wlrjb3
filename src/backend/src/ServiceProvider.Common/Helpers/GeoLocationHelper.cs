using System;
using Microsoft.Spatial;
using NetTopologySuite.Geometries;

namespace ServiceProvider.Common.Helpers
{
    /// <summary>
    /// Provides utilities for geographic location operations including distance calculations,
    /// coordinate validation, and spatial point creation using WGS84 coordinate system.
    /// </summary>
    public static class GeoLocationHelper
    {
        // Earth radius constants for distance calculations
        private const double EARTH_RADIUS_MILES = 3959.0;
        private const double EARTH_RADIUS_KILOMETERS = 6371.0;

        // WGS84 coordinate system bounds
        private const double MAX_LATITUDE = 90.0;
        private const double MIN_LATITUDE = -90.0;
        private const double MAX_LONGITUDE = 180.0;
        private const double MIN_LONGITUDE = -180.0;

        /// <summary>
        /// Creates a GeographyPoint from latitude and longitude coordinates using WGS84 (SRID 4326).
        /// </summary>
        /// <param name="latitude">The latitude coordinate in degrees</param>
        /// <param name="longitude">The longitude coordinate in degrees</param>
        /// <returns>A GeographyPoint object with SRID 4326</returns>
        /// <exception cref="ArgumentOutOfRangeException">Thrown when coordinates are invalid</exception>
        public static GeographyPoint CreateGeographyPoint(double latitude, double longitude)
        {
            if (!ValidateCoordinates(latitude, longitude))
            {
                throw new ArgumentOutOfRangeException(
                    $"Invalid coordinates: Latitude must be between {MIN_LATITUDE} and {MAX_LATITUDE}, " +
                    $"Longitude must be between {MIN_LONGITUDE} and {MAX_LONGITUDE}");
            }

            // Create point with SRID 4326 (WGS84)
            return GeographyPoint.Create(latitude, longitude, 4326);
        }

        /// <summary>
        /// Creates a NetTopologySuite Point geometry from coordinates for advanced spatial calculations.
        /// </summary>
        /// <param name="latitude">The latitude coordinate in degrees</param>
        /// <param name="longitude">The longitude coordinate in degrees</param>
        /// <returns>A Point geometry with SRID 4326</returns>
        /// <exception cref="ArgumentOutOfRangeException">Thrown when coordinates are invalid</exception>
        public static Point CreatePoint(double latitude, double longitude)
        {
            if (!ValidateCoordinates(latitude, longitude))
            {
                throw new ArgumentOutOfRangeException(
                    $"Invalid coordinates: Latitude must be between {MIN_LATITUDE} and {MAX_LATITUDE}, " +
                    $"Longitude must be between {MIN_LONGITUDE} and {MAX_LONGITUDE}");
            }

            var point = new Point(longitude, latitude) { SRID = 4326 };
            return point;
        }

        /// <summary>
        /// Calculates the great circle distance between two points using the Haversine formula.
        /// </summary>
        /// <param name="lat1">Latitude of first point in degrees</param>
        /// <param name="lon1">Longitude of first point in degrees</param>
        /// <param name="lat2">Latitude of second point in degrees</param>
        /// <param name="lon2">Longitude of second point in degrees</param>
        /// <param name="inKilometers">If true, returns distance in kilometers; otherwise in miles</param>
        /// <returns>Distance between points in specified unit, rounded to 2 decimal places</returns>
        /// <exception cref="ArgumentOutOfRangeException">Thrown when coordinates are invalid</exception>
        public static double CalculateDistance(double lat1, double lon1, double lat2, double lon2, bool inKilometers = false)
        {
            if (!ValidateCoordinates(lat1, lon1) || !ValidateCoordinates(lat2, lon2))
            {
                throw new ArgumentOutOfRangeException("Invalid coordinates provided");
            }

            // Convert coordinates to radians
            var lat1Rad = lat1 * Math.PI / 180.0;
            var lon1Rad = lon1 * Math.PI / 180.0;
            var lat2Rad = lat2 * Math.PI / 180.0;
            var lon2Rad = lon2 * Math.PI / 180.0;

            // Calculate differences
            var dLat = lat2Rad - lat1Rad;
            var dLon = lon2Rad - lon1Rad;

            // Haversine formula
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(lat1Rad) * Math.Cos(lat2Rad) *
                   Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            var distance = (inKilometers ? EARTH_RADIUS_KILOMETERS : EARTH_RADIUS_MILES) * c;

            return Math.Round(distance, 2);
        }

        /// <summary>
        /// Determines if a point is within a specified radius of a center point.
        /// </summary>
        /// <param name="center">The center GeographyPoint</param>
        /// <param name="point">The point to check</param>
        /// <param name="radiusMiles">The radius in miles</param>
        /// <returns>True if the point is within the radius, false otherwise</returns>
        /// <exception cref="ArgumentNullException">Thrown when points are null</exception>
        /// <exception cref="ArgumentOutOfRangeException">Thrown when radius is invalid</exception>
        public static bool IsPointInRadius(GeographyPoint center, GeographyPoint point, double radiusMiles)
        {
            if (center == null || point == null)
            {
                throw new ArgumentNullException(center == null ? nameof(center) : nameof(point));
            }

            if (radiusMiles <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(radiusMiles), "Radius must be greater than zero");
            }

            var radiusMeters = ConvertMilesToMeters(radiusMiles);
            var distance = center.Distance(point);

            return distance <= radiusMeters;
        }

        /// <summary>
        /// Validates if given coordinates are within valid WGS84 ranges.
        /// </summary>
        /// <param name="latitude">The latitude to validate</param>
        /// <param name="longitude">The longitude to validate</param>
        /// <returns>True if coordinates are valid, false otherwise</returns>
        public static bool ValidateCoordinates(double latitude, double longitude)
        {
            return latitude >= MIN_LATITUDE && latitude <= MAX_LATITUDE &&
                   longitude >= MIN_LONGITUDE && longitude <= MAX_LONGITUDE;
        }

        /// <summary>
        /// Converts distance from miles to meters for spatial queries.
        /// </summary>
        /// <param name="miles">The distance in miles</param>
        /// <returns>The distance in meters</returns>
        /// <exception cref="ArgumentOutOfRangeException">Thrown when miles is negative</exception>
        public static double ConvertMilesToMeters(double miles)
        {
            if (miles < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(miles), "Distance cannot be negative");
            }

            const double MILES_TO_METERS = 1609.344;
            return Math.Round(miles * MILES_TO_METERS, 2);
        }
    }
}