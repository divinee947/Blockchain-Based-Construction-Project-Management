;; Material Tracking Contract
;; Records supplies used in construction

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map materials
  {
    project-id: (string-ascii 36),
    material-id: (string-ascii 36)
  }
  {
    name: (string-ascii 100),
    quantity: uint,
    unit: (string-ascii 20),
    supplier: (string-ascii 100),
    delivery-date: uint,
    status: (string-ascii 20)
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_ALREADY_EXISTS u101)
(define-constant ERR_NOT_FOUND u102)

;; Read-only functions
(define-read-only (get-material (project-id (string-ascii 36)) (material-id (string-ascii 36)))
  (map-get? materials { project-id: project-id, material-id: material-id })
)

(define-read-only (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Public functions
(define-public (add-material
    (project-id (string-ascii 36))
    (material-id (string-ascii 36))
    (name (string-ascii 100))
    (quantity uint)
    (unit (string-ascii 20))
    (supplier (string-ascii 100))
    (delivery-date uint)
  )
  (let ((existing-material (get-material project-id material-id)))
    (asserts! (is-none existing-material) (err ERR_ALREADY_EXISTS))

    (ok (map-set materials
      { project-id: project-id, material-id: material-id }
      {
        name: name,
        quantity: quantity,
        unit: unit,
        supplier: supplier,
        delivery-date: delivery-date,
        status: "ordered"
      }
    ))
  )
)

(define-public (update-material-status
    (project-id (string-ascii 36))
    (material-id (string-ascii 36))
    (new-status (string-ascii 20))
  )
  (match (get-material project-id material-id)
    material (ok (map-set materials
                  { project-id: project-id, material-id: material-id }
                  (merge material { status: new-status })
                ))
    (err ERR_NOT_FOUND)
  )
)

(define-public (update-material-quantity
    (project-id (string-ascii 36))
    (material-id (string-ascii 36))
    (new-quantity uint)
  )
  (match (get-material project-id material-id)
    material (ok (map-set materials
                  { project-id: project-id, material-id: material-id }
                  (merge material { quantity: new-quantity })
                ))
    (err ERR_NOT_FOUND)
  )
)

(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (ok (var-set admin new-admin))
  )
)
