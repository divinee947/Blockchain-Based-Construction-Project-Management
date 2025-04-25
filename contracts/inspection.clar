;; Inspection Contract
;; Manages regulatory and quality reviews

;; Define data variables
(define-data-var admin principal tx-sender)
(define-map inspectors
  { inspector-id: (string-ascii 36) }
  {
    principal: principal,
    name: (string-ascii 100),
    organization: (string-ascii 100),
    is-verified: bool
  }
)

(define-map inspections
  {
    project-id: (string-ascii 36),
    inspection-id: (string-ascii 36)
  }
  {
    inspector-id: (string-ascii 36),
    inspection-type: (string-ascii 50),
    date: uint,
    status: (string-ascii 20),
    comments: (string-ascii 500),
    passed: bool
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_ALREADY_EXISTS u101)
(define-constant ERR_NOT_FOUND u102)
(define-constant ERR_INVALID_INSPECTOR u103)

;; Read-only functions
(define-read-only (get-inspector (inspector-id (string-ascii 36)))
  (map-get? inspectors { inspector-id: inspector-id })
)

(define-read-only (get-inspection (project-id (string-ascii 36)) (inspection-id (string-ascii 36)))
  (map-get? inspections { project-id: project-id, inspection-id: inspection-id })
)

(define-read-only (is-admin)
  (is-eq tx-sender (var-get admin))
)

(define-read-only (is-inspector (inspector-id (string-ascii 36)))
  (match (get-inspector inspector-id)
    inspector (is-eq tx-sender (get principal inspector))
    false
  )
)

;; Public functions
(define-public (register-inspector
    (inspector-id (string-ascii 36))
    (name (string-ascii 100))
    (organization (string-ascii 100))
  )
  (let ((existing-inspector (get-inspector inspector-id)))
    (asserts! (is-none existing-inspector) (err ERR_ALREADY_EXISTS))

    (ok (map-set inspectors
      { inspector-id: inspector-id }
      {
        principal: tx-sender,
        name: name,
        organization: organization,
        is-verified: false
      }
    ))
  )
)

(define-public (verify-inspector (inspector-id (string-ascii 36)))
  (begin
    (asserts! (is-admin) (err ERR_UNAUTHORIZED))

    (match (get-inspector inspector-id)
      inspector (ok (map-set inspectors
                    { inspector-id: inspector-id }
                    (merge inspector { is-verified: true })
                  ))
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (schedule-inspection
    (project-id (string-ascii 36))
    (inspection-id (string-ascii 36))
    (inspector-id (string-ascii 36))
    (inspection-type (string-ascii 50))
    (date uint)
  )
  (begin
    (asserts! (is-some (get-inspector inspector-id)) (err ERR_INVALID_INSPECTOR))

    (ok (map-set inspections
      { project-id: project-id, inspection-id: inspection-id }
      {
        inspector-id: inspector-id,
        inspection-type: inspection-type,
        date: date,
        status: "scheduled",
        comments: "",
        passed: false
      }
    ))
  )
)

(define-public (complete-inspection
    (project-id (string-ascii 36))
    (inspection-id (string-ascii 36))
    (comments (string-ascii 500))
    (passed bool)
  )
  (begin
    (match (get-inspection project-id inspection-id)
      inspection (begin
        (asserts! (is-inspector (get inspector-id inspection)) (err ERR_UNAUTHORIZED))

        (ok (map-set inspections
          { project-id: project-id, inspection-id: inspection-id }
          (merge inspection {
            status: "completed",
            comments: comments,
            passed: passed
          })
        ))
      )
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
