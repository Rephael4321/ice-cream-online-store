-- Query to show all phone numbers and their order counts, ordered from highest to lowest
SELECT
    c.phone AS "phone_number",
    c.name AS "client_name",
    COUNT(o.id) AS "total_orders",
    SUM(o.total) AS "total_spent",
    AVG(o.total) AS "average_order_value",
    MIN(o.created_at) AS "first_order_date",
    MAX(o.created_at) AS "last_order_date",
    COUNT(
        CASE
            WHEN o.is_paid = true THEN 1
        END
    ) AS "paid_orders",
    COUNT(
        CASE
            WHEN o.is_delivered = true THEN 1
        END
    ) AS "delivered_orders"
FROM clients c
    LEFT JOIN orders o ON c.id = o.client_id
    AND o.is_visible = true
GROUP BY
    c.id,
    c.phone,
    c.name
HAVING
    COUNT(o.id) > 0 -- Only show clients who have made orders
ORDER BY total_orders DESC, total_spent DESC;