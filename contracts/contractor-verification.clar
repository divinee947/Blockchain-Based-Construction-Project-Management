;; Contractor Verification Contract
;; Validates qualified builders for construction projects

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map contractors
  { contractor-id: (string-ascii 36) }
  {
    principal: principal,
    name: (string-ascii 100),
    license-number: (string-ascii 50),
    specialization: (string-ascii 50),
    is-verified: bool,
    rating: uint
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_ALREADY_REGISTERED u101)
(define-constant ERR_NOT_FOUND u102)

;; Read-only functions
(define-read-only (get-contractor (contractor-id (string-ascii 36)))
  (map-get? contractors { contractor-id: contractor-id })
)

(define-read-only (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Public functions
(define-public (register-contractor
    (contractor-id (string-ascii 36))
    (name (string-ascii 100))
    (license-number (string-ascii 50))
    (specialization (string-ascii 50))
  )
  (let ((existing-contractor (get-contractor contractor-id)))
    (asserts! (is-none existing-contractor) (err ERR_ALREADY_REGISTERED))

    (ok (map-set contractors
      { contractor-id: contractor-id }
      {
        principal: tx-sender,
        name: name,
        license-number: license-number,
        specialization: specialization,
        is-verified: false,
        rating: u0
      }
    ))
  )
)

(define-public (verify-contractor (contractor-id (string-ascii 36)))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (match (get-contractor contractor-id)
      contractor (ok (map-set contractors
                      { contractor-id: contractor-id }
                      (merge contractor { is-verified: true })
                    ))
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (rate-contractor (contractor-id (string-ascii 36)) (new-rating uint))
  (begin
    (asserts! (<= new-rating u5) (err u103)) ;; Rating must be between 0-5
    (match (get-contractor contractor-id)
      contractor (ok (map-set contractors
                      { contractor-id: contractor-id }
                      (merge contractor { rating: new-rating })
                    ))
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))
    (ok (var-set admin new-admin))
  )
)
