<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

require '/var/www/clientes/shared/formularios/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$config_path = $_SERVER['DOCUMENT_ROOT'] . '/config_web.json';

if (!file_exists($config_path)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Configuración no encontrada']);
    exit;
}

$config = json_decode(file_get_contents($config_path), true);
$to    = $config['business']['email'] ?? '';
$brand = $config['business']['brand_name'] ?? 'Mi Negocio';

if (!$to) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Email destino no configurado']);
    exit;
}

$name    = htmlspecialchars(trim($_POST['name'] ?? ''));
$email   = htmlspecialchars(trim($_POST['email'] ?? ''));
$phone   = htmlspecialchars(trim($_POST['phone'] ?? ''));
$message = htmlspecialchars(trim($_POST['message'] ?? ''));

if (!$name || !$email || !$message) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Campos requeridos vacíos']);
    exit;
}

$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'innovatech.ec.2010@gmail.com';
    $mail->Password   = 'qtqjunhuajxjpbij';
    $mail->SMTPSecure = 'tls';
    $mail->Port       = 587;
    $mail->CharSet    = 'UTF-8';

    $mail->setFrom('innovatech.ec.2010@gmail.com', $brand);
    $mail->addAddress($to);
    $mail->addReplyTo($email, $name);

    $mail->Subject = "Nuevo mensaje desde $brand";
    $mail->Body    = "Nombre: $name\nEmail: $email\nTeléfono: $phone\n\nMensaje:\n$message";

    $mail->send();
    echo json_encode(['success' => true, 'message' => 'Mensaje enviado correctamente']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $mail->ErrorInfo]);
}
